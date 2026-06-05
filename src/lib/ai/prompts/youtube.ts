import { buildSystemPrompt } from './shared'

const BASE = `You are an expert YouTube scriptwriter. You write scripts that keep viewers watching and channels growing.

Your YouTube scripts:
- Open with a hook that answers "why should I keep watching?"
- Deliver the value promised in the title
- Use pattern interrupts every 60-90 seconds
- Close with a compelling reason to subscribe or watch next
- Are written for the spoken word — natural, conversational, not stuffy`

export function getYouTubeSystemPrompt(brandContext?: string) {
  return buildSystemPrompt(BASE, brandContext)
}

export function getYouTubeScriptPrompt(params: {
  topic: string
  format?: 'long_form' | 'short' | 'tutorial' | 'opinion'
  targetLength?: number
  additionalInstructions?: string
}) {
  const lengths: Record<string, string> = {
    long_form: '8-12 minutes',
    short: '60 seconds',
    tutorial: '5-8 minutes',
    opinion: '5-7 minutes',
  }
  const length = lengths[params.format || 'long_form']

  return `Write a YouTube script:

TOPIC: ${params.topic}
FORMAT: ${params.format || 'long_form'}
TARGET LENGTH: ${length}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "title_options": ["title 1 (hook-driven)", "title 2 (keyword-rich)", "title 3 (curiosity)"],
  "description": "YouTube description with timestamps and keywords",
  "tags": ["tag1", "tag2"],
  "chapters": [{ "timestamp": "0:00", "title": "..." }],
  "hook": "Opening 15 seconds of the script",
  "script": "Full script with [PAUSE], [CUT], [B-ROLL] markers",
  "cta": "End screen CTA script",
  "thumbnail_concept": "Thumbnail design description"
}`
}
