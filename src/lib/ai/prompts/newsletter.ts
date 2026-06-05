import { buildSystemPrompt } from './shared'

const BASE = `You are an expert newsletter writer. You write newsletters that subscribers look forward to reading.

Your newsletters:
- Feel personal, like a letter from a trusted friend
- Have one clear theme or insight per issue
- Mix practical value with personality
- Use short paragraphs and clear sections
- Never stuff multiple topics in without connection
- Always make the reader feel smarter after reading`

export function getNewsletterSystemPrompt(brandContext?: string) {
  return buildSystemPrompt(BASE, brandContext)
}

export function getNewsletterPrompt(params: {
  topic: string
  type?: 'weekly' | 'monthly' | 'educational' | 'product' | 'digest'
  additionalInstructions?: string
}) {
  return `Write a newsletter:

TOPIC: ${params.topic}
TYPE: ${params.type || 'weekly'}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "subject_line": "Email subject line",
  "preview_text": "Preview text (40-90 chars)",
  "greeting": "Opening line",
  "body": "Full newsletter body in Markdown",
  "cta": "Call to action",
  "ps": "Optional P.S. line"
}`
}
