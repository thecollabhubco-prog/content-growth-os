import type { PublisherInterface, ContentPayload, PublishResult } from './interface'
import { logger } from '@/lib/logger'

interface WordPressCredentials {
  siteUrl: string
  username: string
  applicationPassword: string
}

export class WordPressAdapter implements PublisherInterface {
  private credentials: WordPressCredentials

  constructor(credentials: WordPressCredentials) {
    this.credentials = credentials
  }

  private get baseUrl() {
    return `${this.credentials.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2`
  }

  private get authHeader() {
    const token = Buffer.from(
      `${this.credentials.username}:${this.credentials.applicationPassword}`
    ).toString('base64')
    return `Basic ${token}`
  }

  private async request(path: string, method: string, body?: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('WordPress API error', { status: response.status, path, error })
      throw new Error(`WordPress error: ${response.status} ${error}`)
    }

    return response.json()
  }

  async publish(content: ContentPayload): Promise<PublishResult> {
    try {
      const meta = content.metadata || {}
      const data = await this.request('/posts', 'POST', {
        title: content.title,
        content: content.contentHtml || content.content,
        status: 'publish',
        slug: meta.slug,
        categories: meta.categories,
        tags: meta.tags,
        meta: {
          _yoast_wpseo_title: meta.seoTitle,
          _yoast_wpseo_metadesc: meta.metaDescription,
        },
      })

      return {
        success: true,
        platformPostId: String(data.id),
        platformPostUrl: data.link,
        rawResponse: data,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async schedule(content: ContentPayload, scheduledAt: Date): Promise<PublishResult> {
    try {
      const meta = content.metadata || {}
      const data = await this.request('/posts', 'POST', {
        title: content.title,
        content: content.contentHtml || content.content,
        status: 'future',
        date: scheduledAt.toISOString(),
        slug: meta.slug,
        categories: meta.categories,
        tags: meta.tags,
      })

      return {
        success: true,
        platformPostId: String(data.id),
        platformPostUrl: data.link,
        rawResponse: data,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async draft(content: ContentPayload): Promise<PublishResult> {
    try {
      const meta = content.metadata || {}
      const data = await this.request('/posts', 'POST', {
        title: content.title,
        content: content.contentHtml || content.content,
        status: 'draft',
        slug: meta.slug,
      })

      return {
        success: true,
        platformPostId: String(data.id),
        platformPostUrl: data.link,
        rawResponse: data,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}
