import { logger } from '@/lib/logger'

export type OpenRouterModel =
  | 'anthropic/claude-3.5-sonnet'
  | 'anthropic/claude-3-haiku'
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'
  | 'google/gemini-pro-1.5'
  | 'deepseek/deepseek-chat'

export interface GenerateOptions {
  model?: OpenRouterModel
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export interface GenerateResult {
  content: string
  model: string
  tokensUsed: number
}

const DEFAULT_MODEL: OpenRouterModel = 'anthropic/claude-3.5-sonnet'

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    userPrompt,
    temperature = 0.7,
    maxTokens = 4096,
  } = options

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Content Growth OS',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('OpenRouter API error', { status: response.status, error, model })
    throw new Error(`OpenRouter error: ${response.status}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  const tokensUsed = data.usage?.total_tokens || 0

  logger.info('AI generation complete', { model, tokensUsed, chars: content.length })

  return { content, model, tokensUsed }
}

export async function generateStream(options: GenerateOptions): Promise<ReadableStream> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    userPrompt,
    temperature = 0.7,
    maxTokens = 4096,
  } = options

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Content Growth OS',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`OpenRouter stream error: ${response.status}`)
  }

  return response.body
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: text,
    }),
  })

  if (!response.ok) {
    throw new Error(`Embedding error: ${response.status}`)
  }

  const data = await response.json()
  return data.data?.[0]?.embedding || []
}
