import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, created, Errors } from '@/lib/utils/api'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function GET(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const db = createAdminClient()

  const { data, error } = await db
    .from('platform_connections')
    .select('id, workspace_id, platform, account_name, account_id, account_url, scopes, is_active, last_sync_at, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return Errors.internal()
  return ok(data)
}

// Connect WordPress (direct credentials, not OAuth)
export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const body = await request.json()
    const { platform, credentials, account_name, account_url, account_id } = body

    if (!platform || !credentials) {
      return Errors.validation('platform and credentials are required')
    }

    const encryptedCredentials = encrypt(JSON.stringify(credentials))

    const db = createAdminClient()

    // Upsert — deactivate old connection for this platform first
    await db
      .from('platform_connections')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId)
      .eq('platform', platform)

    const { data, error } = await db
      .from('platform_connections')
      .insert({
        workspace_id: workspaceId,
        platform,
        account_name: account_name || null,
        account_id: account_id || null,
        account_url: account_url || null,
        credentials_encrypted: encryptedCredentials as unknown as import('@/types/database.types').Json,
        is_active: true,
      })
      .select('id, platform, account_name, account_url, is_active, created_at')
      .single()

    if (error) {
      logger.error('Failed to save connection', { error })
      return Errors.internal(error.message)
    }

    logger.info('Platform connected', { platform, workspaceId })
    return created(data)
  } catch (error) {
    return Errors.internal(String(error))
  }
}

export async function DELETE(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')

  if (!platform) return Errors.validation('platform query param required')

  const db = createAdminClient()
  const { error } = await db
    .from('platform_connections')
    .update({ is_active: false })
    .eq('workspace_id', workspaceId)
    .eq('platform', platform)

  if (error) return Errors.internal(error.message)
  return ok({ disconnected: true, platform })
}
