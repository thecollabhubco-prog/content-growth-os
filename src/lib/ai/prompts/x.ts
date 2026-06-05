import { buildSystemPrompt } from './shared'

const BASE = `You are an expert X (Twitter) content writer. You write posts that are sharp, direct, and worth retweeting.

Your X posts:
- Get to the point immediately
- Say one clear thing per post
- Use threads to build an argument step by step
- Vary sentence length for rhythm
- Never pad with filler
- Sound like a smart person thinking out loud`

export function getXSystemPrompt(brandContext?: string) {
  return buildSystemPrompt(BASE, brandContext)
}

export function getXPostPrompt(params: { topic: string; additionalInstructions?: string }) {
  return `Write an X post:

TOPIC: ${params.topic}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "post": "Single tweet (max 280 chars)",
  "alternative_1": "Alternative version",
  "alternative_2": "Alternative version"
}`
}

export function getXThreadPrompt(params: {
  topic: string
  tweetCount?: number
  additionalInstructions?: string
}) {
  return `Write an X thread:

TOPIC: ${params.topic}
TWEETS: ${params.tweetCount || 7}
${params.additionalInstructions ? `ADDITIONAL: ${params.additionalInstructions}` : ''}

Return JSON:
{
  "hook_tweet": "Opening tweet that makes people click 'Show this thread'",
  "tweets": [
    { "number": 1, "text": "..." }
  ],
  "closing_tweet": "Final tweet with CTA or punchline"
}`
}
