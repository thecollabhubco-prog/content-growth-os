export interface ContentPayload {
  title?: string
  content: string
  contentHtml?: string
  platform: string
  metadata?: Record<string, unknown>
  imageUrl?: string
  scheduledAt?: Date
}

export interface PublishResult {
  success: boolean
  platformPostId?: string
  platformPostUrl?: string
  error?: string
  rawResponse?: unknown
}

export interface PublisherInterface {
  publish(content: ContentPayload): Promise<PublishResult>
  schedule(content: ContentPayload, scheduledAt: Date): Promise<PublishResult>
  draft(content: ContentPayload): Promise<PublishResult>
  getMetrics?(postId: string): Promise<Record<string, number>>
}
