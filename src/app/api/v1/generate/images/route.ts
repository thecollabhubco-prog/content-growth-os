import { NextRequest } from 'next/server'
import { ok, Errors } from '@/lib/utils/api'
import { logger } from '@/lib/logger'

type ImageModel = 'dall-e-3' | 'flux' | 'gemini'

async function generateWithDallE(prompt: string, size: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: 'standard',
      response_format: 'url',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DALL-E error: ${error}`)
  }

  const data = await response.json()
  return data.data[0].url as string
}

const platformSizes: Record<string, string> = {
  blog: '1792x1024',
  linkedin: '1024x1024',
  instagram: '1024x1024',
  youtube: '1792x1024',
  x: '1792x1024',
  default: '1024x1024',
}

export async function POST(request: NextRequest) {
  try {

    const body = await request.json()
    const {
      prompt,
      type = 'custom',
      platform = 'default',
      model = 'dall-e-3',
    } = body

    if (!prompt) return Errors.validation('prompt is required')

    const size = platformSizes[platform] || platformSizes.default

    let imageUrl: string
    switch (model as ImageModel) {
      case 'dall-e-3':
      default:
        imageUrl = await generateWithDallE(prompt, size)
    }

    logger.info('Image generated', { platform, type, model })

    return ok({
      image_url: imageUrl,
      prompt,
      platform,
      type,
      model,
    })
  } catch (error) {
    logger.error('Image generation failed', { error: String(error) })
    return Errors.aiError(String(error))
  }
}
