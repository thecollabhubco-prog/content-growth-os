import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/google/oauth'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
// Placeholder user id used when there's no auth session
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code) {
    return NextResponse.redirect(`${origin}/publishing?error=google_auth_missing_code`)
  }

  let workspaceId = DEFAULT_WORKSPACE_ID
  try {
    const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString('utf-8'))
    workspaceId = decoded.workspace_id || DEFAULT_WORKSPACE_ID
  } catch {
    workspaceId = state || DEFAULT_WORKSPACE_ID
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const googleUser = await getGoogleUserInfo(tokens.access_token)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createAdminClient() as any

    // Try upsert on google_user_id + workspace_id
    const { data: existing } = await db
      .from('google_connections')
      .select('id')
      .eq('google_user_id', googleUser.id)
      .eq('workspace_id', workspaceId)
      .single()

    if (existing) {
      await db
        .from('google_connections')
        .update({
          access_token_encrypted: encrypt(tokens.access_token),
          refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          token_expires_at: expiresAt,
          is_active: true,
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      const { error } = await db
        .from('google_connections')
        .insert({
          workspace_id: workspaceId,
          user_id: SYSTEM_USER_ID,
          email: googleUser.email,
          google_user_id: googleUser.id,
          access_token_encrypted: encrypt(tokens.access_token),
          refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
          token_expires_at: expiresAt,
          scopes: ['gmail.readonly', 'gmail.compose', 'gmail.modify', 'calendar', 'drive'],
          is_active: true,
        })

      if (error) {
        logger.error('Failed to save Google connection', { error })
        return NextResponse.redirect(`${origin}/publishing?error=google_auth_save_failed`)
      }
    }

    logger.info('Google account connected', { email: googleUser.email, workspaceId })
    return NextResponse.redirect(
      `${origin}/publishing?success=google_connected&email=${encodeURIComponent(googleUser.email)}`
    )
  } catch (error) {
    logger.error('Google OAuth callback error', { error: String(error) })
    return NextResponse.redirect(`${origin}/publishing?error=google_auth_failed`)
  }
}
