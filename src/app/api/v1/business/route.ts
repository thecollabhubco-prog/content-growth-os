import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
    || request.headers.get('x-workspace-id')
    || DEFAULT_WORKSPACE_ID

  const db = createAdminClient()
  const { data: items, error } = await db
    .from('knowledge_items')
    .select('id, type, title, content, tags, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .in('type', ['business_info', 'brand_voice', 'audience_persona', 'offer', 'service', 'writing_preference', 'case_study'])
    .order('updated_at', { ascending: false })

  if (error) return Errors.internal(error.message)
  return ok({ items: items || [] })
}
