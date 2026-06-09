import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { getNewsletterSystemPrompt, getNewsletterPrompt } from '@/lib/ai/prompts/newsletter'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { input, format = 'weekly', model, use_knowledge_brain = true } = body
    if (!input?.topic) return Errors.validation('input.topic is required')

    const brandContext = use_knowledge_brain
      ? await buildKnowledgeContext(workspaceId, input.topic)
      : undefined

    const systemPrompt = getNewsletterSystemPrompt(brandContext)
    const userPrompt = getNewsletterPrompt({
      topic: input.topic,
      type: format,
      additionalInstructions: input.additional_instructions,
    })

    const result = await generate({ systemPrompt, userPrompt, model, maxTokens: 4096 })

    let parsed: Record<string, unknown>
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { body: result.content }
    } catch { parsed = { body: result.content } }

    const db = createTypedAdminClient()
    const { data: contentItem } = await from(db, 'content_items').insert({
      workspace_id: workspaceId,
      type: 'newsletter',
      platform: 'email',
      title: String(parsed.subject_line || input.topic),
      content: String(parsed.body || JSON.stringify(parsed)),
      metadata: parsed as unknown as Json,
      status: 'draft',
      model_used: result.model,
      generation_tokens: result.tokensUsed,
      created_by: null,
    }).select().single()

    return ok({ content_item_id: contentItem?.id, type: 'newsletter', ...parsed, model_used: result.model, tokens_used: result.tokensUsed })
  } catch (error) {
    logger.error('Newsletter generation failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
