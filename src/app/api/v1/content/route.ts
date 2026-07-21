import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'

// DELETE /api/v1/content?id=<uuid> — discard an unpublished draft.
// Published items are protected: we never silently delete live work.
export async function DELETE(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Errors.validation('id query param required')

  const db = createTypedAdminClient()
  const { data: item } = await from(db, 'content_items')
    .select('id, status')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single()

  if (!item) return Errors.notFound('Content item')
  if (item.status === 'published') {
    return Errors.validation('Cannot delete a published item — unpublish it on the platform first')
  }

  const { error } = await from(db, 'content_items').delete().eq('id', id)
  if (error) return Errors.internal(error.message)
  return ok({ deleted: true, id })
}

export async function GET(request: NextRequest) {

  const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = (page - 1) * limit

  const db = createTypedAdminClient()
  let query = from(db, 'content_items')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (platform) query = query.eq('platform', platform)
  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)

  const { data, error, count } = await query

  if (error) return Errors.internal()

  return ok(data, { page, limit, total: count || 0 })
}
