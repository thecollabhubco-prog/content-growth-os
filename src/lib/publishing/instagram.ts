import type { PublisherInterface, ContentPayload, PublishResult } from './interface'
import { logger } from '@/lib/logger'

/**
 * Instagram Content Publishing via Meta Graph API.
 * Requires a Facebook Page + connected Instagram Business Account.
 * Flow: create media container → publish container.
 */
export class InstagramAdapter implements PublisherInterface {
  private accessToken: string
  private igAccountId: string

  constructor(credentials: { accessToken: string; igAccountId: string; pageId?: string }) {
    this.accessToken = credentials.accessToken
    this.igAccountId = credentials.igAccountId
  }

  private async request(path: string, method = 'GET', body?: Record<string, unknown>) {
    const url = `https://graph.facebook.com/v19.0${path}`
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify({ ...body, access_token: this.accessToken }) : undefined,
    })
    if (!res.ok) {
      const err = await res.text()
      logger.error('Instagram API error', { status: res.status, path, err })
      throw new Error(`Instagram API ${res.status}: ${err}`)
    }
    return res.json()
  }

  async publish(content: ContentPayload): Promise<PublishResult> {
    try {
      const caption = content.content.slice(0, 2200) // Instagram caption limit

      let containerId: string

      if (content.imageUrl) {
        // Image post: create container with image URL
        const container = await this.request(`/${this.igAccountId}/media`, 'POST', {
          image_url: content.imageUrl,
          caption,
        })
        containerId = container.id
      } else {
        // Text-only: use a reel with caption (Instagram requires media)
        // Fall back to a text carousel (requires image)
        // For caption-only, we note this limitation
        return {
          success: false,
          error: 'Instagram requires an image or video. Provide imageUrl in platform_params.',
        }
      }

      // Wait for container to be ready (poll up to 30s)
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const status = await this.request(`/${containerId}?fields=status_code`)
        if (status.status_code === 'FINISHED') break
        if (status.status_code === 'ERROR') {
          throw new Error(`Media container failed: ${status.status_code}`)
        }
      }

      // Publish the container
      const published = await this.request(`/${this.igAccountId}/media_publish`, 'POST', {
        creation_id: containerId,
      })

      const postId: string = published.id
      return {
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.instagram.com/p/${postId}/`,
        rawResponse: published,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async schedule(_content: ContentPayload, _scheduledAt: Date): Promise<PublishResult> {
    return { success: false, error: 'Instagram scheduling via Content Calendar + automation' }
  }

  async draft(content: ContentPayload): Promise<PublishResult> {
    logger.info('Instagram draft saved internally', { caption: content.content.slice(0, 50) })
    return { success: true, platformPostId: 'internal_draft' }
  }
}
