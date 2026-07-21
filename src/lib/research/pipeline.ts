import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { tavilySearch, formatTavilyResults } from '@/lib/research/tavily'
import { scrapeUrl } from '@/lib/research/firecrawl'
import { generate } from '@/lib/ai/openrouter'
import { getResearchBriefPrompt } from '@/lib/ai/prompts/research'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export interface ResearchOutcome {
  sessionId: string
  status: 'completed' | 'failed'
  brief: Record<string, unknown>
  summary: string
  error?: string
}

/**
 * Runs the full research pipeline SYNCHRONOUSLY and returns the result.
 *
 * This must be awaited within the request — serverless functions freeze the
 * moment the HTTP response is sent, so fire-and-forget background work never
 * completes (that's why sessions used to hang on "running" forever).
 */
export async function performResearch(
  workspaceId: string,
  title: string,
  inputType: string,
  inputData: string
): Promise<ResearchOutcome> {
  const db = createTypedAdminClient()

  const { data: session } = await from(db, 'research_sessions')
    .insert({ workspace_id: workspaceId, title, input_type: inputType, input_data: inputData, status: 'running', created_by: null })
    .select()
    .single()

  const sessionId = session?.id as string

  try {
    // 1. Gather raw material
    let rawContent = ''
    if (inputType === 'url') {
      const scraped = await scrapeUrl(inputData)
      rawContent = scraped.markdown
    } else {
      // 'basic' depth with fewer results: on Vercel Hobby the whole request has
      // a hard 60s ceiling, and 'advanced' over 8 results was costing ~15s of it.
      const searchRes = await tavilySearch(inputData, { searchDepth: 'basic', maxResults: 5, includeAnswer: true })
      rawContent = formatTavilyResults(searchRes.results)
      if (searchRes.answer) rawContent = `AI Answer: ${searchRes.answer}\n\n${rawContent}`
    }

    // 2. Build the brief with a FREE model (paid gpt-4o would 402 on a $0 account)
    // Free models generate ~7s minimum per call and the whole request must fit
    // inside Vercel Hobby's 60s ceiling (planner + search + this synthesis).
    // 1000 tokens keeps the brief complete while leaving headroom; raising this
    // is what pushed research over the limit and got the function killed.
    const briefResult = await generate({
      systemPrompt: 'You are an expert content strategist and SEO researcher. Always return valid JSON.',
      userPrompt: getResearchBriefPrompt({ topic: inputData, searchResults: rawContent }),
      maxTokens: 1000,
    })

    let brief: Record<string, unknown> = {}
    try {
      const jsonMatch = briefResult.content.match(/\{[\s\S]*\}/)
      brief = jsonMatch ? JSON.parse(jsonMatch[0]) : { content_brief: briefResult.content }
    } catch {
      brief = { content_brief: briefResult.content }
    }

    await from(db, 'research_sessions')
      .update({
        status: 'completed',
        content_brief: brief.content_brief as string,
        keyword_opportunities: (brief.keyword_opportunities || []) as unknown as Json,
        competitor_analysis: (brief.competitor_analysis || []) as unknown as Json,
        topic_clusters: (brief.topic_clusters || []) as unknown as Json,
        faq_opportunities: (brief.faq_opportunities || []) as unknown as Json,
        content_gaps: (brief.content_gaps || []) as unknown as Json,
        recommended_formats: (brief.recommended_formats || []) as unknown as Json,
        results: brief as unknown as Json,
      })
      .eq('id', sessionId)

    logger.info('Research completed', { sessionId })

    // 3. Build a short human summary for chat
    const keywords = (brief.keyword_opportunities as { keyword: string }[] | undefined)?.slice(0, 5).map(k => k.keyword).filter(Boolean) || []
    const gaps = (brief.content_gaps as string[] | undefined)?.slice(0, 3) || []
    const summaryParts: string[] = []
    if (keywords.length) summaryParts.push(`**Keyword opportunities:** ${keywords.join(', ')}`)
    if (gaps.length) summaryParts.push(`**Content gaps:** ${gaps.join('; ')}`)
    const summary = summaryParts.length
      ? summaryParts.join('\n')
      : (brief.content_brief ? String(brief.content_brief).slice(0, 600) : 'Research complete — see the Research section for the full brief.')

    return { sessionId, status: 'completed', brief, summary }
  } catch (error) {
    await from(db, 'research_sessions').update({ status: 'failed' }).eq('id', sessionId).catch(() => {})
    logger.error('Research failed', { sessionId, error: String(error) })
    return { sessionId, status: 'failed', brief: {}, summary: '', error: String(error) }
  }
}
