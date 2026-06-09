import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { getXSystemPrompt, getXPostPrompt, getXThreadPrompt } from '@/lib/ai/prompts/x'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { input, format = 'post', model, use_knowledge_brain = true } = body
    if (!input?.topic) return Errors.validation('input.topic is required')

    const brandContext = use_knowledge_brain
      ? await buildKnowledgeContext(workspaceId, input.topic)
      : undefined

    const systemPrompt = getXSystemPrompt(brandContext)
    const userPrompt = format === 'thread'
      ? getXThreadPrompt({ topic: input.topic, tweetCount: input.tweet_count, additionalInstructions: input.additional_instructions })
      : getXPostPrompt({ topic: input.topic, additionalInstructions: input.additional_instructions })

    const result = await generate({ systemPrompt, userPrompt, model })

    let parsed: Record<string, unknown>
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { post: result.content }
    } catch { parsed = { post: result.content } }

    const db = createTypedAdminClient()
    const { data: contentItem } = await from(db, 'content_items').insert({
      workspace_id: workspaceId,
      type: format === 'thread' ? 'x_thread' : 'x_post',
      platform: 'x',
      title: input.topic,
      content: String(parsed.post || parsed.hook_tweet || JSON.stringify(parsed)),
      metadata: parsed as unknown as Json,
      status: 'draft',
      model_used: result.model,
      generation_tokens: result.tokensUsed,
      created_by: null,
    }).select().single()

    return ok({ content_item_id: contentItem?.id, type: format === 'thread' ? 'x_thread' : 'x_post', ...parsed, model_used: result.model, tokens_used: result.tokensUsed })
  } catch (error) {
    logger.error('X generation failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
