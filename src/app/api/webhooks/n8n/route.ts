import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublisher } from '@/lib/publishing/publisher-factory'
import { logger } from '@/lib/logger'

// ─── Outbound: send event TO n8n ─────────────────────────────────────────────
export async function triggerN8nWebhook(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!webhookUrl) return // n8n not configured — silently skip

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-n8n-secret': secret } : {}),
      },
      body: JSON.stringify({ event, ...payload, timestamp: new Date().toISOString() }),
    })
  } catch (err) {
    logger.error('Failed to trigger n8n webhook', { event, err: String(err) })
  }
}

// ─── Inbound: receive events FROM n8n ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-n8n-secret')
    if (process.env.N8N_WEBHOOK_SECRET && secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, workspace_id, data } = body

    if (!action || !workspace_id) {
      return NextResponse.json({ error: 'action and workspace_id required' }, { status: 400 })
    }

    logger.info('n8n webhook received', { action, workspace_id })

    const db = createAdminClient()

    switch (action) {

      // ── Log a workflow run ──────────────────────────────────────────────
      case 'log_automation_run': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from('automation_runs') as any).insert({
          workspace_id,
          workflow_name: data.workflow_name,
          trigger_type: data.trigger_type,
          status: data.status || 'completed',
          input_data: data.input || {},
          output_data: data.output || {},
          steps_completed: data.steps_completed || 0,
          total_steps: data.total_steps || 0,
          n8n_execution_id: data.execution_id,
          completed_at: new Date().toISOString(),
        })
        break
      }

      // ── Store trend signals from n8n research workflows ─────────────────
      case 'store_trend_signals': {
        if (Array.isArray(data.signals)) {
          for (const signal of data.signals) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (db.from('trend_signals') as any).insert({
              workspace_id,
              source: signal.source,
              topic: signal.topic,
              signal_strength: signal.strength,
              trend_direction: signal.direction,
              content_opportunity: signal.opportunity,
              raw_data: signal.raw_data || {},
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            })
          }
        }
        return NextResponse.json({ success: true, action, stored: data.signals?.length || 0 })
      }

      // ── Actually publish due scheduled content ───────────────────────────
      case 'publish_scheduled_content': {
        const now = new Date().toISOString()

        const { data: dueItems } = await db
          .from('content_items')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('status', 'scheduled')
          .lte('scheduled_at', now)

        if (!dueItems || dueItems.length === 0) {
          return NextResponse.json({ success: true, published: 0, message: 'No due items' })
        }

        const results: { id: string; platform: string; success: boolean; error?: string }[] = []

        for (const item of dueItems) {
          const platform = item.platform
          if (!platform) { results.push({ id: item.id, platform: 'unknown', success: false, error: 'No platform' }); continue }

          const { data: connection } = await db
            .from('platform_connections')
            .select('*')
            .eq('workspace_id', workspace_id)
            .eq('platform', platform)
            .eq('is_active', true)
            .single()

          if (!connection) {
            results.push({ id: item.id, platform, success: false, error: `No active ${platform} connection` })
            continue
          }

          try {
            const publisher = createPublisher(connection)
            const result = await publisher.publish({
              title: item.title || undefined,
              content: item.content || '',
              contentHtml: item.content_html || undefined,
              platform,
              metadata: item.metadata as Record<string, unknown> || {},
            })

            await db.from('content_items').update({
              status: result.success ? 'published' : 'failed',
              published_at: result.success ? new Date().toISOString() : null,
            }).eq('id', item.id)

            results.push({ id: item.id, platform, success: result.success, error: result.error })
          } catch (err) {
            await db.from('content_items').update({ status: 'failed' }).eq('id', item.id)
            results.push({ id: item.id, platform, success: false, error: String(err) })
          }
        }

        const publishedCount = results.filter(r => r.success).length
        logger.info('Scheduled publish complete', { workspace_id, total: dueItems.length, published: publishedCount })
        return NextResponse.json({ success: true, action, total: dueItems.length, published: publishedCount, results })
      }

      // ── Create a content item from n8n (e.g. from research workflow) ─────
      case 'create_content': {
        if (!data.content || !data.type) {
          return NextResponse.json({ error: 'data.content and data.type required' }, { status: 400 })
        }
        const { data: newItem, error: insertError } = await db
          .from('content_items')
          .insert({
            workspace_id,
            type: data.type,
            platform: data.platform || null,
            title: data.title || null,
            content: data.content,
            status: 'draft',
            tags: data.tags || [],
            metadata: data.metadata || {},
          })
          .select('id, type, platform, status')
          .single()

        if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
        return NextResponse.json({ success: true, action, item: newItem })
      }

      // ── Calendar entry from n8n ──────────────────────────────────────────
      case 'add_calendar_entry': {
        if (!data.title || !data.scheduled_date) {
          return NextResponse.json({ error: 'data.title and data.scheduled_date required' }, { status: 400 })
        }
        const { data: entry, error: calError } = await db
          .from('calendar_entries')
          .insert({
            workspace_id,
            title: data.title,
            platform: data.platform || null,
            scheduled_date: data.scheduled_date,
            scheduled_time: data.scheduled_time || null,
            status: data.status || 'planned',
            notes: data.notes || null,
          })
          .select('id')
          .single()

        if (calError) return NextResponse.json({ error: calError.message }, { status: 500 })
        return NextResponse.json({ success: true, action, entry_id: entry?.id })
      }

      default:
        logger.warn('Unknown n8n action', { action })
    }

    return NextResponse.json({ success: true, action })
  } catch (error) {
    logger.error('n8n webhook error', { error: String(error) })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
