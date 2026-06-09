import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, created, Errors } from '@/lib/utils/api'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function GET(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const platform = searchParams.get('platform')

  const db = createAdminClient()
  let query = db
    .from('calendar_entries')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('scheduled_date', { ascending: true })

  if (start) query = query.gte('scheduled_date', start)
  if (end) query = query.lte('scheduled_date', end)
  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query
  if (error) return Errors.internal(error.message)
  return ok(data)
}

export async function POST(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const body = await request.json()
  const { title, platform, content_type, scheduled_date, scheduled_time, content_item_id, notes, color } = body

  if (!title || !scheduled_date) return Errors.validation('title and scheduled_date are required')

  const db = createAdminClient()
  const scheduledAt = scheduled_time ? `${scheduled_date}T${scheduled_time}:00` : null

  const { data, error } = await db
    .from('calendar_entries')
    .insert({
      workspace_id: workspaceId,
      title,
      platform: platform || null,
      content_type: content_type || null,
      scheduled_date,
      scheduled_time: scheduled_time || null,
      scheduled_at: scheduledAt,
      content_item_id: content_item_id || null,
      notes: notes || null,
      color: color || null,
    })
    .select()
    .single()

  if (error) return Errors.internal(error.message)
  return created(data)
}

export async function PATCH(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return Errors.validation('id is required')

  const db = createAdminClient()
  const { data, error } = await db
    .from('calendar_entries')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .single()

  if (error) return Errors.internal(error.message)
  return ok(data)
}

export async function DELETE(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return Errors.validation('id query param required')

  const db = createAdminClient()
  const { error } = await db
    .from('calendar_entries')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)

  if (error) return Errors.internal(error.message)
  return ok({ deleted: true })
}
