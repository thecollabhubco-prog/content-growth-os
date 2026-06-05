import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, created, Errors } from '@/lib/utils/api'
import { tavilySearch, formatTavilyResults } from '@/lib/research/tavily'
import { scrapeUrl } from '@/lib/research/firecrawl'
import { generate } from '@/lib/ai/openrouter'
import { getResearchBriefPrompt } from '@/lib/ai/prompts/research'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) return Errors.validation('x-workspace-id header required')

  const db = createTypedAdminClient()
  const { data, error } = await from(db, 'research_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return Errors.internal()
  return ok(data)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized()

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) return Errors.validation('x-workspace-id header required')

    const body = await request.json()
    const { title, input_type, input_data, options = {} } = body

    if (!title || !input_type || !input_data) {
      return Errors.validation('title, input_type, and input_data are required')
    }

    const db = createTypedAdminClient()
    const { data: session, error: sessionError } = await from(db, 'research_sessions')
      .insert({
        workspace_id: workspaceId,
        title,
        input_type,
        input_data,
        status: 'running',
        created_by: user.id,
      })
      .select()
      .single()

    if (sessionError || !session) return Errors.internal(sessionError?.message)

    runResearch(session.id, workspaceId, input_type, input_data, options).catch(err =>
      logger.error('Research pipeline failed', { sessionId: session.id, error: String(err) })
    )

    return created({ session_id: session.id, status: 'running' })
  } catch (error) {
    return Errors.internal(String(error))
  }
}

async function runResearch(
  sessionId: string,
  _workspaceId: string,
  inputType: string,
  inputData: string,
  _options: Record<string, boolean>
) {
  const db = createTypedAdminClient()

  try {
    let rawContent = ''

    if (inputType === 'url') {
      const scraped = await scrapeUrl(inputData)
      rawContent = scraped.markdown
    } else if (inputType === 'topic' || inputType === 'keyword') {
      const searchRes = await tavilySearch(inputData, { searchDepth: 'advanced', maxResults: 10, includeAnswer: true })
      rawContent = formatTavilyResults(searchRes.results)
      if (searchRes.answer) rawContent = `AI Answer: ${searchRes.answer}\n\n${rawContent}`
    } else {
      rawContent = inputData
    }

    const briefResult = await generate({
      model: 'openai/gpt-4o',
      systemPrompt: 'You are an expert content strategist and SEO researcher.',
      userPrompt: getResearchBriefPrompt({ topic: inputData, searchResults: rawContent }),
      maxTokens: 4096,
    })

    let brief: Record<string, unknown> = {}
    try {
      const jsonMatch = briefResult.content.match(/\{[\s\S]*\}/)
      brief = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    } catch {
      brief = { content_brief: briefResult.content }
    }

    await from(db, 'research_sessions')
      .update({
        status: 'completed',
        content_brief: brief.content_brief as string,
        keyword_opportunities: (brief.keyword_opportunities || []) as unknown as import('@/types/database.types').Json,
        competitor_analysis: (brief.competitor_analysis || []) as unknown as import('@/types/database.types').Json,
        topic_clusters: (brief.topic_clusters || []) as unknown as import('@/types/database.types').Json,
        faq_opportunities: (brief.faq_opportunities || []) as unknown as import('@/types/database.types').Json,
        content_gaps: (brief.content_gaps || []) as unknown as import('@/types/database.types').Json,
        recommended_formats: (brief.recommended_formats || []) as unknown as import('@/types/database.types').Json,
        results: brief as unknown as import('@/types/database.types').Json,
      })
      .eq('id', sessionId)

    logger.info('Research session completed', { sessionId })
  } catch (error) {
    await from(db, 'research_sessions').update({ status: 'failed' }).eq('id', sessionId)
    throw error
  }
}
