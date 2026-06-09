import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { getBlogSystemPrompt, getBlogUserPrompt } from '@/lib/ai/prompts/blog'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { input, model, use_knowledge_brain = true, research_session_id } = body

    if (!input?.topic) return Errors.validation('input.topic is required')

    let brandContext: string | undefined
    if (use_knowledge_brain) {
      brandContext = await buildKnowledgeContext(workspaceId, input.topic)
    }

    const systemPrompt = getBlogSystemPrompt(brandContext)
    const userPrompt = getBlogUserPrompt({
      topic: input.topic,
      keywords: input.keywords || [],
      tone: input.tone,
      targetLength: input.length,
      additionalInstructions: input.additional_instructions,
    })

    const result = await generate({ systemPrompt, userPrompt, model, maxTokens: 6000 })

    let parsed: Record<string, unknown>
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { article: result.content }
    } catch {
      parsed = { article: result.content }
    }

    const db = createTypedAdminClient()
    const { data: contentItem, error: dbError } = await from(db, 'content_items')
      .insert({
        workspace_id: workspaceId,
        research_session_id: research_session_id || null,
        type: 'blog',
        platform: 'blog',
        title: String(parsed.h1 || parsed.seo_title || input.topic),
        content: String(parsed.article || result.content),
        metadata: parsed as unknown as import('@/types/database.types').Json,
        seo_data: null,
        status: 'draft',
        model_used: result.model,
        generation_tokens: result.tokensUsed,
        created_by: null,
      })
      .select()
      .single()

    if (dbError) {
      logger.error('Failed to save blog content', { error: dbError })
      return Errors.internal('Failed to save content')
    }

    return ok({
      content_item_id: contentItem.id,
      type: 'blog',
      ...parsed,
      model_used: result.model,
      tokens_used: result.tokensUsed,
    })
  } catch (error) {
    logger.error('Blog generation failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
