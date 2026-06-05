import { buildSystemPrompt } from './shared'

const BASE = `You are an expert Instagram content strategist. You write captions and carousel copy that gets saves, shares, and follows.

Your Instagram content:
- Opens with a scroll-stopping first line
- Delivers real value quickly
- Uses white space and line breaks for mobile readability
- Closes with a CTA that feels natural
- Uses hashtags strategically (10-15 max, niche-specific)`

export function getInstagramSystemPrompt(brandContext?: string) {
  return buildSystemPrompt(BASE, brandContext)
}

export function getInstagramCaptionPrompt(params: {
  topic: string
  format?: 'educational' | 'story' | 'quote' | 'promotional'
  additionalInstructions?: string
}) {
  return `Write an Instagram caption:

TOPIC: ${params.topic}
FORMAT: ${params.format || 'educational'}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "caption": "Full caption with line breaks and emojis used tastefully",
  "hook": "First line only",
  "hashtags": ["hashtag1", "hashtag2"],
  "alt_text": "Image alt text description",
  "suggested_image_prompt": "AI image generation prompt"
}`
}

export function getInstagramCarouselPrompt(params: {
  topic: string
  slideCount?: number
  additionalInstructions?: string
}) {
  return `Write an Instagram carousel:

TOPIC: ${params.topic}
SLIDES: ${params.slideCount || 8}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "title": "Carousel series title",
  "caption": "Post caption",
  "slides": [
    { "number": 1, "headline": "...", "body": "...", "visual_note": "..." }
  ],
  "hashtags": ["hashtag1"],
  "cta_slide": { "headline": "...", "body": "..." }
}`
}
