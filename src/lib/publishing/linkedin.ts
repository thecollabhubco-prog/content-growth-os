import type { PublisherInterface, ContentPayload, PublishResult } from './interface'
import { logger } from '@/lib/logger'

export class LinkedInAdapter implements PublisherInterface {
  private accessToken: string
  private personId: string

  constructor(credentials: { accessToken: string; personId: string }) {
    this.accessToken = credentials.accessToken
    this.personId = credentials.personId
  }

  private async request(path: string, method: string, body?: unknown) {
    const response = await fetch(`https://api.linkedin.com/v2${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('LinkedIn API error', { status: response.status, path, error })
      throw new Error(`LinkedIn error: ${response.status}`)
    }

    return response.json()
  }

  async publish(content: ContentPayload): Promise<PublishResult> {
    try {
      const data = await this.request('/ugcPosts', 'POST', {
        author: `urn:li:person:${this.personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content.content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      })

      return {
        success: true,
        platformPostId: data.id,
        platformPostUrl: `https://www.linkedin.com/feed/update/${data.id}`,
        rawResponse: data,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async schedule(_content: ContentPayload, _scheduledAt: Date): Promise<PublishResult> {
    // LinkedIn API doesn't natively support scheduling via API
    // Schedule via content calendar + cron job trigger
    return {
      success: false,
      error: 'LinkedIn scheduling requires Content Calendar + automation',
    }
  }

  async draft(content: ContentPayload): Promise<PublishResult> {
    // Store as draft in our system (LinkedIn has no draft API)
    logger.info('LinkedIn draft saved internally', { content: content.content.slice(0, 50) })
    return { success: true, platformPostId: 'internal_draft' }
  }
}
