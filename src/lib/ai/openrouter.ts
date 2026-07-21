import { logger } from '@/lib/logger'

export type OpenRouterModel =
  | 'google/gemma-4-31b-it:free'
  | 'qwen/qwen3-next-80b-a3b-instruct:free'
  | 'openai/gpt-oss-120b:free'
  | 'openai/gpt-oss-20b:free'
  | 'meta-llama/llama-3.3-70b-instruct:free'
  | 'anthropic/claude-haiku-4.5'
  | 'anthropic/claude-sonnet-4.5'
  | 'anthropic/claude-sonnet-4.6'
  | 'anthropic/claude-opus-4.5'
  | 'anthropic/claude-3.5-haiku'
  | 'openai/gpt-4o'
  | 'openai/gpt-4o-mini'

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

// Gemma 4 writes noticeably more human, marketing-grade prose than the
// reasoning-tuned gpt-oss models (tested head-to-head), so it leads for quality.
const DEFAULT_MODEL: OpenRouterModel = 'google/gemma-4-31b-it:free'

// Free-tier accounts share a small daily/per-minute request pool PER model.
// Each :free model has its own independent pool, so falling back across
// several of them (instead of retrying the same one) multiplies effective
// capacity AND resilience without spending anything. Ordered best-prose-first.
const FREE_FALLBACK_MODELS: OpenRouterModel[] = [
  'google/gemma-4-31b-it:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callOpenRouter(model: OpenRouterModel, systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
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
}

export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    userPrompt,
    temperature = 0.7,
    maxTokens = 4096,
  } = options

  // Try the requested model first, then fall back across other free models
  // on 429 (rate limited), with a short backoff between attempts.
  const candidates = [model, ...FREE_FALLBACK_MODELS.filter(m => m !== model)]
  let lastError = ''

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const response = await callOpenRouter(candidate, systemPrompt, userPrompt, temperature, maxTokens)

    if (response.ok) {
      const data = await response.json()
      const content = data.choices?.[0]?.message?.content || ''
      const tokensUsed = data.usage?.total_tokens || 0

      if (candidate !== model) {
        logger.info('OpenRouter fell back to alternate free model', { requested: model, used: candidate })
      }
      logger.info('AI generation complete', { model: candidate, tokensUsed, chars: content.length })

      return { content, model: candidate, tokensUsed }
    }

    const error = await response.text()
    lastError = error
    logger.error('OpenRouter API error', { status: response.status, error, model: candidate })

    // Only retry/fallback on rate limiting — other errors (bad request, auth) won't
    // be fixed by switching models.
    if (response.status !== 429) {
      throw new Error(`OpenRouter error: ${response.status}`)
    }

    if (i < candidates.length - 1) {
      await sleep(600 * (i + 1))
    }
  }

  logger.error('All OpenRouter free models exhausted', { lastError })
  throw new Error('OpenRouter error: 429 (all free models rate-limited, try again shortly)')
}

async function callOpenRouterStream(model: OpenRouterModel, systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
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
}

export async function generateStream(options: GenerateOptions): Promise<ReadableStream> {
  const {
    model = DEFAULT_MODEL,
    systemPrompt,
    userPrompt,
    temperature = 0.7,
    maxTokens = 4096,
  } = options

  const candidates = [model, ...FREE_FALLBACK_MODELS.filter(m => m !== model)]

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const response = await callOpenRouterStream(candidate, systemPrompt, userPrompt, temperature, maxTokens)

    if (response.ok && response.body) {
      if (candidate !== model) {
        logger.info('OpenRouter stream fell back to alternate free model', { requested: model, used: candidate })
      }
      return response.body
    }

    const status = response.status
    logger.error('OpenRouter stream error', { status, model: candidate })

    if (status !== 429) {
      throw new Error(`OpenRouter stream error: ${status}`)
    }

    if (i < candidates.length - 1) {
      await sleep(600 * (i + 1))
    }
  }

  throw new Error('OpenRouter stream error: 429 (all free models rate-limited, try again shortly)')
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
