import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { getLinkedInSystemPrompt, getLinkedInPostPrompt, getLinkedInCarouselPrompt } from '@/lib/ai/prompts/linkedin'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized()

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) return Errors.validation('x-workspace-id header required')

    const body = await request.json()
    const { input, format = 'post', model, use_knowledge_brain = true } = body

    if (!input?.topic) return Errors.validation('input.topic is required')

    let brandContext: string | undefined
    if (use_knowledge_brain) {
      brandContext = await buildKnowledgeContext(workspaceId, input.topic)
    }

    const systemPrompt = getLinkedInSystemPrompt(brandContext)
    const userPrompt = format === 'carousel'
      ? getLinkedInCarouselPrompt({ topic: input.topic, slideCount: input.slide_count, additionalInstructions: input.additional_instructions })
      : getLinkedInPostPrompt({ topic: input.topic, angle: input.angle, format: input.post_format, additionalInstructions: input.additional_instructions })

    const result = await generate({ systemPrompt, userPrompt, model })

    let parsed: Record<string, unknown>
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { post: result.content }
    } catch {
      parsed = { post: result.content }
    }

    const contentType = format === 'carousel' ? 'linkedin_carousel' : 'linkedin_post'
    const db = createTypedAdminClient()
    const { data: contentItem } = await from(db, 'content_items')
      .insert({
        workspace_id: workspaceId,
        type: contentType,
        platform: 'linkedin',
        title: input.topic,
        content: String(parsed.post || parsed.caption || JSON.stringify(parsed)),
        metadata: parsed as unknown as import('@/types/database.types').Json,
        status: 'draft',
        model_used: result.model,
        generation_tokens: result.tokensUsed,
        created_by: user.id,
      })
      .select()
      .single()

    return ok({
      content_item_id: contentItem?.id,
      type: contentType,
      ...parsed,
      model_used: result.model,
      tokens_used: result.tokensUsed,
    })
  } catch (error) {
    logger.error('LinkedIn generation failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
