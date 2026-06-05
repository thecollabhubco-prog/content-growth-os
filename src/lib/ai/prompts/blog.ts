import { buildSystemPrompt } from './shared'

const BASE = `You are an expert content writer specializing in SEO-optimized blog articles with a human, founder-style voice.

Your articles:
- Read like a smart person wrote them, not an AI
- Lead with a hook that makes the reader want to keep going
- Use real examples, mini-stories, and specific details
- Have clear H2 and H3 structure that makes scanning easy
- End with a CTA that feels natural, not salesy
- Are formatted in Markdown`

export function getBlogSystemPrompt(brandContext?: string) {
  return buildSystemPrompt(BASE, brandContext)
}

export function getBlogUserPrompt(params: {
  topic: string
  keywords: string[]
  tone?: string
  targetLength?: 'short' | 'medium' | 'long'
  outline?: string
  additionalInstructions?: string
}) {
  const wordCounts = { short: '800-1200', medium: '1500-2000', long: '2500-3500' }
  const length = wordCounts[params.targetLength || 'medium']

  return `Write a blog article with the following specifications:

TOPIC: ${params.topic}
TARGET KEYWORDS: ${params.keywords.join(', ')}
TONE: ${params.tone || 'conversational and authoritative'}
TARGET LENGTH: ${length} words
${params.outline ? `OUTLINE TO FOLLOW:\n${params.outline}` : ''}
${params.additionalInstructions ? `ADDITIONAL INSTRUCTIONS:\n${params.additionalInstructions}` : ''}

FORMAT YOUR OUTPUT AS JSON:
{
  "seo_title": "SEO-optimized title (50-60 chars)",
  "geo_title": "Conversational title for GEO/AI search",
  "meta_description": "Meta description (150-160 chars)",
  "url_slug": "url-slug-here",
  "h1": "H1 headline",
  "article": "Full article in Markdown",
  "faq": [
    { "question": "...", "answer": "..." }
  ],
  "cta": "Call to action paragraph"
}`
}

export function getBlogSEOPrompt(article: string, keywords: string[]) {
  return `Analyze this blog article and return SEO metadata as JSON:

ARTICLE:
${article.slice(0, 3000)}

TARGET KEYWORDS: ${keywords.join(', ')}

Return JSON:
{
  "internal_link_suggestions": ["anchor text | target page topic"],
  "external_link_suggestions": ["anchor text | suggested source type"],
  "schema_markup": { "@type": "Article", ... },
  "secondary_keywords": ["keyword1", "keyword2"],
  "reading_level": "beginner | intermediate | advanced",
  "word_count": 0
}`
}
