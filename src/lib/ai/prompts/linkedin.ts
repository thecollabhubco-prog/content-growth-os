import { buildSystemPrompt } from './shared'

const BASE = `You are an expert LinkedIn content strategist. You write posts that build authority, earn engagement, and sound like a real founder sharing real experiences.

Your LinkedIn posts:
- Open with a one-line hook that stops the scroll
- Tell a story or share a specific insight
- Are structured with line breaks for readability (no walls of text)
- End with a question or observation that invites replies
- Never sound like a corporate press release
- Never use hashtag spam (max 3 relevant hashtags)

INTEGRITY RULES — ABSOLUTE:
- NEVER fabricate client results, ARR figures, revenue numbers, or case study outcomes
- NEVER claim "a client of mine achieved X" or "we helped a firm go from Y to Z" unless the user explicitly provides these facts
- The business is currently in pre-client thought leadership phase — credibility comes from sharp insight, not made-up social proof
- If writing about real business scenarios, frame them as observations ("most founders I speak to...") or honest hypotheticals ("imagine a firm where...")
- Do NOT invent testimonials, logos, or specific metrics`

export function getLinkedInSystemPrompt(brandContext?: string) {
  return buildSystemPrompt(BASE, brandContext)
}

export function getLinkedInPostPrompt(params: {
  topic: string
  angle?: string
  format?: 'thought_leadership' | 'story' | 'educational' | 'authority' | 'engagement'
  additionalInstructions?: string
}) {
  return `Write a LinkedIn post:

TOPIC: ${params.topic}
ANGLE: ${params.angle || 'thought leadership'}
FORMAT: ${params.format || 'thought_leadership'}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "post": "Full LinkedIn post text with line breaks",
  "hook": "First line of the post",
  "hashtags": ["hashtag1", "hashtag2"],
  "suggested_image_prompt": "Image generation prompt for this post"
}`
}

export function getLinkedInCarouselPrompt(params: {
  topic: string
  slideCount?: number
  additionalInstructions?: string
}) {
  return `Write a LinkedIn carousel:

TOPIC: ${params.topic}
SLIDES: ${params.slideCount || 8}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "title": "Carousel title",
  "caption": "Post caption (appears before the carousel)",
  "slides": [
    { "slide_number": 1, "headline": "...", "body": "...", "visual_note": "..." }
  ],
  "hashtags": ["hashtag1", "hashtag2"],
  "cta_slide": { "headline": "...", "body": "..." }
}`
}
