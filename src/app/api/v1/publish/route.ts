import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'
import { createPublisher } from '@/lib/publishing/publisher-factory'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const body = await request.json()
    const { content_item_id, platform, schedule_at, platform_params = {} } = body

    if (!content_item_id || !platform) {
      return Errors.validation('content_item_id and platform are required')
    }

    const db = createAdminClient()

    const { data: contentItem } = await db
      .from('content_items')
      .select('*')
      .eq('id', content_item_id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!contentItem) return Errors.notFound('Content item')

    const { data: connection } = await db
      .from('platform_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)
      .eq('is_active', true)
      .single()

    if (!connection) {
      return Errors.notFound(`No active ${platform} connection. Connect it in Publishing Settings.`)
    }

    const { data: attempt } = await db
      .from('publish_attempts')
      .insert({
        workspace_id: workspaceId,
        content_item_id,
        platform_connection_id: connection.id,
        platform,
        status: schedule_at ? 'pending' : 'publishing',
      })
      .select()
      .single()

    if (!attempt) return Errors.internal('Failed to create publish attempt')

    if (schedule_at) {
      await db
        .from('content_items')
        .update({ status: 'scheduled', scheduled_at: schedule_at })
        .eq('id', content_item_id)
      return ok({ attempt_id: attempt.id, status: 'scheduled', scheduled_at: schedule_at })
    }

    const publisher = createPublisher(connection)
    const result = await publisher.publish({
      title: contentItem.title || undefined,
      content: contentItem.content || '',
      contentHtml: contentItem.content_html || undefined,
      platform,
      metadata: { ...(contentItem.metadata as object), ...platform_params },
    })

    await db
      .from('publish_attempts')
      .update({
        status: result.success ? 'published' : 'failed',
        platform_post_id: result.platformPostId,
        platform_post_url: result.platformPostUrl,
        published_at: result.success ? new Date().toISOString() : null,
        error_message: result.error,
        response_payload: result.rawResponse as unknown as import('@/types/database.types').Json,
      })
      .eq('id', attempt.id)

    if (result.success) {
      await db
        .from('content_items')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', content_item_id)
    } else {
      logger.error('Publish failed', { platform, error: result.error })
      return Errors.publishError(result.error)
    }

    return ok({
      attempt_id: attempt.id,
      status: 'published',
      platform_post_id: result.platformPostId,
      platform_post_url: result.platformPostUrl,
    })
  } catch (error) {
    logger.error('Publish route error', { error: String(error) })
    return Errors.internal(String(error))
  }
}
