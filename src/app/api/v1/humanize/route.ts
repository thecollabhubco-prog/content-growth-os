import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { generate } from '@/lib/ai/openrouter'
import { getHumanizationAnalysisPrompt, getHumanizationRewritePrompt } from '@/lib/ai/prompts/humanize'
import { logger } from '@/lib/logger'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { content_item_id, content, auto_rewrite = false } = body

    if (!content_item_id && !content) {
      return Errors.validation('content_item_id or content is required')
    }

    const db = createTypedAdminClient()
    let originalContent = content

    if (content_item_id) {
      const { data: item } = await from(db, 'content_items')
        .select('content')
        .eq('id', content_item_id)
        .eq('workspace_id', workspaceId)
        .single()
      if (!item?.content) return Errors.notFound('Content item')
      originalContent = item.content
    }

    // Step 1: Analyze
    const analysisResult = await generate({
      model: 'openai/gpt-oss-20b:free',
      systemPrompt: 'You are an AI content quality analyzer. Return only valid JSON.',
      userPrompt: getHumanizationAnalysisPrompt(originalContent),
      temperature: 0.1,
      maxTokens: 1500,
    })

    let analysis: {
      ai_detection_score: number
      readability_score: number
      natural_language_score: number
      writing_quality_score: number
      repetition_score: number
      overall_score: number
      issues: object[]
      rewrite_required: boolean
      summary: string
    }

    try {
      const jsonMatch = analysisResult.content.match(/\{[\s\S]*\}/)
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { overall_score: 0.5, issues: [], rewrite_required: false }
    } catch {
      analysis = {
        ai_detection_score: 0,
        readability_score: 0.7,
        natural_language_score: 0.7,
        writing_quality_score: 0.7,
        repetition_score: 0.8,
        overall_score: 0.7,
        issues: [],
        rewrite_required: false,
        summary: 'Analysis unavailable',
      }
    }

    let humanizedContent: string | null = null

    // Step 2: Rewrite if needed
    if (auto_rewrite && (analysis.rewrite_required || analysis.overall_score < 0.7)) {
      const rewriteResult = await generate({
        model: 'openai/gpt-oss-20b:free',
        systemPrompt: 'You are an expert editor. Rewrite content to sound natural and human.',
        userPrompt: getHumanizationRewritePrompt(originalContent, analysis.issues),
        temperature: 0.8,
        maxTokens: 5000,
      })
      humanizedContent = rewriteResult.content
    }

    // Update content item if provided
    if (content_item_id) {
      const updateData: Record<string, unknown> = {
        humanization_data: analysis,
      }
      if (humanizedContent) {
        updateData.content = humanizedContent
      }
      await from(db, 'content_items')
        .update(updateData)
        .eq('id', content_item_id)
    }

    logger.info('Humanization complete', { score: analysis.overall_score, rewritten: !!humanizedContent })

    return ok({
      analysis,
      humanized_content: humanizedContent,
      rewrite_applied: !!humanizedContent,
    })
  } catch (error) {
    logger.error('Humanization failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
