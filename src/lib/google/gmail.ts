import { logger } from '@/lib/logger'

const BASE = 'https://gmail.googleapis.com/gmail/v1'

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: { name: string; value: string }[]
    body?: { data?: string }
    parts?: { mimeType: string; body: { data?: string } }[]
  }
  internalDate: string
}

interface GmailThread {
  id: string
  historyId: string
  messages: GmailMessage[]
}

export class GmailClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  private async request(path: string, method = 'GET', body?: unknown) {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      logger.error('Gmail API error', { status: response.status, path, error })
      throw new Error(`Gmail error: ${response.status}`)
    }

    return response.json()
  }

  async listThreads(params: {
    q?: string
    labelIds?: string[]
    maxResults?: number
    pageToken?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params.q) searchParams.set('q', params.q)
    if (params.maxResults) searchParams.set('maxResults', String(params.maxResults))
    if (params.pageToken) searchParams.set('pageToken', params.pageToken)
    if (params.labelIds) params.labelIds.forEach(l => searchParams.append('labelIds', l))

    return this.request(`/users/me/threads?${searchParams.toString()}`) as Promise<{
      threads: { id: string; historyId: string }[]
      nextPageToken?: string
      resultSizeEstimate: number
    }>
  }

  async getThread(threadId: string): Promise<GmailThread> {
    return this.request(`/users/me/threads/${threadId}?format=full`)
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    return this.request(`/users/me/messages/${messageId}?format=full`)
  }

  async createDraft(params: {
    to: string[]
    subject: string
    body: string
    threadId?: string
    cc?: string[]
  }) {
    const raw = this.buildRaw(params)
    return this.request('/users/me/drafts', 'POST', {
      message: { raw, threadId: params.threadId },
    })
  }

  async sendEmail(params: {
    to: string[]
    subject: string
    body: string
    threadId?: string
    cc?: string[]
  }) {
    const raw = this.buildRaw(params)
    return this.request('/users/me/messages/send', 'POST', {
      raw,
      threadId: params.threadId,
    })
  }

  async modifyThread(threadId: string, params: { addLabelIds?: string[]; removeLabelIds?: string[] }) {
    return this.request(`/users/me/threads/${threadId}/modify`, 'POST', params)
  }

  async markAsRead(threadId: string) {
    return this.modifyThread(threadId, { removeLabelIds: ['UNREAD'] })
  }

  async markAsStarred(threadId: string) {
    return this.modifyThread(threadId, { addLabelIds: ['STARRED'] })
  }

  private buildRaw(params: { to: string[]; subject: string; body: string; cc?: string[]; threadId?: string }) {
    const headers = [
      `To: ${params.to.join(', ')}`,
      `Subject: ${params.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ...(params.cc?.length ? [`Cc: ${params.cc.join(', ')}`] : []),
    ].join('\r\n')

    const message = `${headers}\r\n\r\n${params.body}`
    return Buffer.from(message).toString('base64url')
  }

  static extractHeader(message: GmailMessage, name: string): string {
    return message.payload.headers.find(
      h => h.name.toLowerCase() === name.toLowerCase()
    )?.value || ''
  }

  static extractBody(message: GmailMessage): string {
    const parts = message.payload.parts || []
    const htmlPart = parts.find(p => p.mimeType === 'text/html')
    const textPart = parts.find(p => p.mimeType === 'text/plain')
    const bodyData = htmlPart?.body?.data || textPart?.body?.data || message.payload.body?.data || ''
    return bodyData ? Buffer.from(bodyData, 'base64url').toString('utf-8') : ''
  }
}
