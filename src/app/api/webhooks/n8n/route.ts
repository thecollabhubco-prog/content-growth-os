import { NextRequest, NextResponse } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get('x-n8n-secret')
    if (secret !== process.env.N8N_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, workspace_id, data } = body

    if (!action || !workspace_id) {
      return NextResponse.json({ error: 'action and workspace_id required' }, { status: 400 })
    }

    logger.info('n8n webhook received', { action, workspace_id })

    const db = createTypedAdminClient()

    switch (action) {
      case 'log_automation_run': {
        await from(db, 'automation_runs').insert({
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
        } as unknown as import('@/types/database.types').Database['public']['Tables']['automation_runs']['Insert'])
        break
      }

      case 'store_trend_signals': {
        if (Array.isArray(data.signals)) {
          for (const signal of data.signals) {
            await from(db, 'trend_signals').insert({
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
        break
      }

      case 'publish_scheduled_content': {
        // Trigger publishing for scheduled content items
        const now = new Date().toISOString()
        const { data: duePosts } = await from(db, 'content_items')
          .select('*')
          .eq('workspace_id', workspace_id)
          .eq('status', 'scheduled')
          .lte('scheduled_at', now)

        logger.info('Due scheduled posts', { count: duePosts?.length || 0, workspace_id })
        return NextResponse.json({ due_posts: duePosts?.length || 0 })
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
