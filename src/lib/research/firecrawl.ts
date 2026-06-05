import { logger } from '@/lib/logger'

interface FirecrawlScrapeResult {
  markdown: string
  metadata: {
    title?: string
    description?: string
    ogTitle?: string
    sourceURL?: string
  }
}

export async function scrapeUrl(url: string): Promise<FirecrawlScrapeResult> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  })

  if (!response.ok) {
    logger.error('Firecrawl scrape failed', { status: response.status, url })
    throw new Error(`Firecrawl error: ${response.status}`)
  }

  const data = await response.json()
  return data.data
}

export async function crawlSite(
  url: string,
  maxPages = 5
): Promise<FirecrawlScrapeResult[]> {
  const response = await fetch('https://api.firecrawl.dev/v1/crawl', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      limit: maxPages,
      scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
    }),
  })

  if (!response.ok) {
    throw new Error(`Firecrawl crawl error: ${response.status}`)
  }

  const { id } = await response.json()

  // Poll for completion
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000))

    const statusRes = await fetch(`https://api.firecrawl.dev/v1/crawl/${id}`, {
      headers: { Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}` },
    })

    const status = await statusRes.json()
    if (status.status === 'completed') {
      return status.data || []
    }
    if (status.status === 'failed') {
      throw new Error('Firecrawl crawl failed')
    }
  }

  throw new Error('Firecrawl crawl timeout')
}
