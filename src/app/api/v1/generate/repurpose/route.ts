import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate, type OpenRouterModel } from '@/lib/ai/openrouter'
import { getBlogSystemPrompt, getBlogUserPrompt } from '@/lib/ai/prompts/blog'
import { getLinkedInSystemPrompt, getLinkedInPostPrompt } from '@/lib/ai/prompts/linkedin'
import { getXSystemPrompt, getXPostPrompt } from '@/lib/ai/prompts/x'
import { getInstagramSystemPrompt, getInstagramCaptionPrompt } from '@/lib/ai/prompts/instagram'
import { getNewsletterSystemPrompt, getNewsletterPrompt } from '@/lib/ai/prompts/newsletter'
import { buildKnowledgeContext } from '@/lib/ai/context-builder'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

type OutputFormat = 'linkedin' | 'x' | 'instagram' | 'newsletter' | 'blog'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const {
      source_content,
      source_content_id,
      output_formats,
      model,
      use_knowledge_brain = true,
    } = body

    if (!source_content && !source_content_id) {
      return Errors.validation('source_content or source_content_id is required')
    }
    if (!output_formats?.length) {
      return Errors.validation('output_formats is required (array of platforms)')
    }

    const db = createTypedAdminClient()
    let sourceText = source_content

    // Fetch source from DB if ID provided
    if (source_content_id) {
      const { data: src } = await from(db, 'content_items')
        .select('content, title')
        .eq('id', source_content_id)
        .single()
      if (!src?.content) return Errors.notFound('Source content')
      sourceText = src.content
    }

    const topic = sourceText.slice(0, 200) // Use first 200 chars as topic context
    const brandContext = use_knowledge_brain
      ? await buildKnowledgeContext(workspaceId, topic)
      : undefined

    // Generate for each requested format
    const results: Record<string, unknown> = {}

    for (const format of output_formats as OutputFormat[]) {
      try {
        let systemPrompt: string
        let userPrompt: string

        const repurposeInstructions = `Repurpose the following content into a ${format} post. Adapt the format, tone, and length appropriately for ${format}. Keep the core insight but make it native to the platform.\n\nSOURCE CONTENT:\n${sourceText.slice(0, 2000)}`

        switch (format) {
          case 'linkedin':
            systemPrompt = getLinkedInSystemPrompt(brandContext)
            userPrompt = getLinkedInPostPrompt({ topic: repurposeInstructions })
            break
          case 'x':
            systemPrompt = getXSystemPrompt(brandContext)
            userPrompt = getXPostPrompt({ topic: repurposeInstructions })
            break
          case 'instagram':
            systemPrompt = getInstagramSystemPrompt(brandContext)
            userPrompt = getInstagramCaptionPrompt({ topic: repurposeInstructions })
            break
          case 'newsletter':
            systemPrompt = getNewsletterSystemPrompt(brandContext)
            userPrompt = getNewsletterPrompt({ topic: repurposeInstructions, type: 'educational' })
            break
          case 'blog':
            systemPrompt = getBlogSystemPrompt(brandContext)
            userPrompt = getBlogUserPrompt({ topic: repurposeInstructions, keywords: [] })
            break
          default:
            continue
        }

        const result = await generate({ systemPrompt, userPrompt, model: model as OpenRouterModel, maxTokens: 3000 })

        let parsed: Record<string, unknown>
        try {
          const jsonMatch = result.content.match(/\{[\s\S]*\}/)
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { content: result.content }
        } catch { parsed = { content: result.content } }

        // Save as content item
        const typeMap: Record<string, string> = {
          linkedin: 'linkedin_post', x: 'x_post', instagram: 'instagram_caption',
          newsletter: 'newsletter', blog: 'blog',
        }

        const { data: contentItem } = await from(db, 'content_items').insert({
          workspace_id: workspaceId,
          parent_content_id: source_content_id || null,
          type: typeMap[format] as 'blog',
          platform: format === 'newsletter' ? 'email' : format as 'blog',
          title: `Repurposed for ${format}`,
          content: String(parsed.post || parsed.caption || parsed.article || parsed.body || parsed.content || JSON.stringify(parsed)),
          metadata: parsed as unknown as Json,
          status: 'draft',
          model_used: result.model,
          generation_tokens: result.tokensUsed,
          created_by: null,
        }).select().single()

        results[format] = { content_item_id: contentItem?.id, ...parsed }
      } catch (err) {
        logger.error(`Repurpose failed for ${format}`, { error: String(err) })
        results[format] = { error: String(err) }
      }
    }

    return ok({ repurposed: results, source_content_id })
  } catch (error) {
    logger.error('Repurpose route error', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
