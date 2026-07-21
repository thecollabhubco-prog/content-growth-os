import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { getYouTubeSystemPrompt, getYouTubeScriptPrompt } from '@/lib/ai/prompts/youtube'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { input, format = 'long_form', model, use_knowledge_brain = true } = body
    if (!input?.topic) return Errors.validation('input.topic is required')

    const brandContext = use_knowledge_brain
      ? await buildKnowledgeContext(workspaceId, input.topic)
      : undefined

    const systemPrompt = getYouTubeSystemPrompt(brandContext)
    const userPrompt = getYouTubeScriptPrompt({
      topic: input.topic,
      format,
      additionalInstructions: input.additional_instructions,
    })

    const result = await generate({ systemPrompt, userPrompt, model, maxTokens: 6000 })

    let parsed: Record<string, unknown>
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { script: result.content }
    } catch { parsed = { script: result.content } }

    const db = createTypedAdminClient()
    const contentType = format === 'short' ? 'youtube_short' : 'youtube_script'
    const { data: contentItem } = await from(db, 'content_items').insert({
      workspace_id: workspaceId,
      type: contentType,
      platform: 'youtube',
      title: String((parsed.title_options as string[])?.[0] || input.topic),
      content: String(parsed.script || JSON.stringify(parsed)),
      metadata: parsed as unknown as Json,
      status: 'draft',
      model_used: result.model,
      generation_tokens: result.tokensUsed,
      created_by: null,
    }).select().single()

    return ok({ content_item_id: contentItem?.id, type: contentType, ...parsed, model_used: result.model, tokens_used: result.tokensUsed })
  } catch (error) {
    logger.error('YouTube generation failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
