import { logger } from '@/lib/logger'

interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
}

interface TavilyResponse {
  results: TavilySearchResult[]
  answer?: string
}

export async function tavilySearch(
  query: string,
  options: {
    searchDepth?: 'basic' | 'advanced'
    maxResults?: number
    includeAnswer?: boolean
    includeDomains?: string[]
    excludeDomains?: string[]
  } = {}
): Promise<TavilyResponse> {
  const {
    searchDepth = 'advanced',
    maxResults = 10,
    includeAnswer = true,
    includeDomains = [],
    excludeDomains = [],
  } = options

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: searchDepth,
      max_results: maxResults,
      include_answer: includeAnswer,
      include_domains: includeDomains,
      exclude_domains: excludeDomains,
    }),
  })

  if (!response.ok) {
    logger.error('Tavily search failed', { status: response.status, query })
    throw new Error(`Tavily error: ${response.status}`)
  }

  return response.json()
}

export function formatTavilyResults(results: TavilySearchResult[]): string {
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
    .join('\n\n---\n\n')
}
