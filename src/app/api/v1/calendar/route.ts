import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, created, Errors } from '@/lib/utils/api'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) return Errors.validation('x-workspace-id header required')

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const platform = searchParams.get('platform')

  const db = createTypedAdminClient()
  let query = from(db, 'calendar_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('scheduled_date', { ascending: true })

  if (start) query = query.gte('scheduled_date', start)
  if (end) query = query.lte('scheduled_date', end)
  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query
  if (error) return Errors.internal()
  return ok(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) return Errors.validation('x-workspace-id header required')

  const body = await request.json()
  const { title, platform, content_type, scheduled_date, scheduled_time, content_item_id, notes, color } = body

  if (!title || !scheduled_date) return Errors.validation('title and scheduled_date are required')

  const db = createTypedAdminClient()
  const scheduledAt = scheduled_time ? `${scheduled_date}T${scheduled_time}:00` : null

  const { data, error } = await from(db, 'calendar_entries').insert({
    workspace_id: workspaceId,
    title,
    platform,
    content_type,
    scheduled_date,
    scheduled_time: scheduled_time || null,
    scheduled_at: scheduledAt,
    content_item_id: content_item_id || null,
    notes: notes || null,
    color: color || null,
    created_by: user.id,
  }).select().single()

  if (error) return Errors.internal(error.message)
  return created(data)
}
