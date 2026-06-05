import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, created, Errors } from '@/lib/utils/api'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) return Errors.validation('x-workspace-id header required')

  const db = createTypedAdminClient()
  const { data, error } = await from(db, 'platform_connections')
    .select('id, workspace_id, platform, account_name, account_id, account_url, scopes, is_active, last_sync_at, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (error) return Errors.internal()

  // Never return encrypted credentials
  return ok(data)
}

// Connect WordPress (direct credentials, not OAuth)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized()

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) return Errors.validation('x-workspace-id header required')

    const body = await request.json()
    const { platform, credentials, account_name, account_url } = body

    if (!platform || !credentials) {
      return Errors.validation('platform and credentials are required')
    }

    // Encrypt credentials before storing
    const encryptedCredentials = encrypt(JSON.stringify(credentials))

    const db = createTypedAdminClient()
    const { data, error } = await from(db, 'platform_connections').insert({
      workspace_id: workspaceId,
      platform,
      account_name: account_name || null,
      account_url: account_url || null,
      credentials_encrypted: encryptedCredentials as unknown as import('@/types/database.types').Json,
      is_active: true,
      connected_by: user.id,
    }).select('id, platform, account_name, account_url, is_active, created_at').single()

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
