import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { tavilySearch, formatTavilyResults } from '@/lib/research/tavily'
import { generate } from '@/lib/ai/openrouter'
import { getTrendAnalysisPrompt } from '@/lib/ai/prompts/research'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export async function GET(request: NextRequest) {

  const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

  const db = createTypedAdminClient()
  const { data, error } = await from(db, 'trend_signals')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('signal_strength', { ascending: false })
    .limit(50)

  if (error) return Errors.internal()
  return ok(data)
}

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { industry = 'business consulting', topics = [] } = body

    logger.info('Running trend scan', { workspaceId, industry })

    // Search for trending topics
    const queries = [
      `${industry} trends 2025 2026`,
      `${industry} latest news`,
      ...(topics as string[]).map((t: string) => `${t} trending`),
    ]

    const allResults: string[] = []
    for (const q of queries.slice(0, 3)) {
      try {
        const res = await tavilySearch(q, { maxResults: 5, searchDepth: 'basic' })
        allResults.push(formatTavilyResults(res.results))
      } catch (e) {
        logger.warn('Trend search failed for query', { q, error: String(e) })
      }
    }

    const signalsRaw = allResults.join('\n\n---\n\n')

    // Analyze trends with AI
    const result = await generate({
      model: 'openai/gpt-4o-mini',
      systemPrompt: 'You are a content trend analyst. Return only valid JSON.',
      userPrompt: getTrendAnalysisPrompt(signalsRaw),
      temperature: 0.3,
      maxTokens: 2000,
    })

    let trends: { trending_topics: object[]; recommended_content: object[] }
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      trends = jsonMatch ? JSON.parse(jsonMatch[0]) : { trending_topics: [], recommended_content: [] }
    } catch {
      trends = { trending_topics: [], recommended_content: [] }
    }

    const db = createTypedAdminClient()

    // Store trend signals
    const storedSignals = []
    for (const topic of (trends.trending_topics as {
      topic: string
      strength: number
      direction: 'rising' | 'stable' | 'declining'
      predicted_peak_days: number
      content_opportunity: string
    }[])) {
      const { data } = await from(db, 'trend_signals').insert({
        workspace_id: workspaceId,
        source: 'tavily',
        topic: topic.topic,
        signal_strength: topic.strength,
        trend_direction: topic.direction,
        content_opportunity: topic.content_opportunity,
        raw_data: topic as unknown as Json,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single()
      if (data) storedSignals.push(data)
    }

    return ok({
      signals_found: storedSignals.length,
      trending_topics: trends.trending_topics,
      recommended_content: trends.recommended_content,
    })
  } catch (error) {
    logger.error('Trend scan failed', { error: String(error) })
    return Errors.externalApi(String(error))
  }
}
