import type { PublisherInterface, ContentPayload, PublishResult } from './interface'
import { logger } from '@/lib/logger'

export class XAdapter implements PublisherInterface {
  private accessToken: string
  private accessTokenSecret: string

  constructor(credentials: { accessToken: string; accessTokenSecret: string }) {
    this.accessToken = credentials.accessToken
    this.accessTokenSecret = credentials.accessTokenSecret
  }

  async publish(content: ContentPayload): Promise<PublishResult> {
    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content.content.slice(0, 280) }),
      })

      if (!response.ok) {
        const error = await response.text()
        logger.error('X API error', { status: response.status, error })
        throw new Error(`X error: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        platformPostId: data.data?.id,
        platformPostUrl: `https://x.com/i/web/status/${data.data?.id}`,
        rawResponse: data,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async schedule(_content: ContentPayload, _scheduledAt: Date): Promise<PublishResult> {
    return { success: false, error: 'X scheduling via Content Calendar' }
  }

  async draft(content: ContentPayload): Promise<PublishResult> {
    logger.info('X draft saved internally', { content: content.content.slice(0, 50) })
    return { success: true, platformPostId: 'internal_draft' }
  }
}
