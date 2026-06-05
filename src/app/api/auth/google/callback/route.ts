import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { exchangeCodeForTokens, getGoogleUserInfo } from '@/lib/google/oauth'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/database.types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // Contains workspaceId

    if (!code) {
      return NextResponse.redirect(`${origin}/settings?error=google_auth_missing_code`)
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(`${origin}/login`)

    // Parse state (workspace_id is encoded in state)
    let workspaceId: string | null = null
    try {
      const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString('utf-8'))
      workspaceId = decoded.workspace_id
    } catch {
      workspaceId = state
    }

    if (!workspaceId) {
      return NextResponse.redirect(`${origin}/settings?error=google_auth_missing_workspace`)
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get user info
    const googleUser = await getGoogleUserInfo(tokens.access_token)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    const db = createTypedAdminClient()

    // Upsert Google connection
    const { data: connection, error } = await from(db, 'google_connections').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      email: googleUser.email,
      google_user_id: googleUser.id,
      access_token_encrypted: encrypt(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      token_expires_at: expiresAt,
      scopes: [
        'gmail.readonly', 'gmail.compose', 'gmail.modify',
        'calendar', 'drive', 'documents',
      ],
      is_active: true,
    }).select('id, email').single()

    if (error) {
      // If duplicate, update instead
      if (error.code === '23505') {
        await from(db, 'google_connections').update({
          access_token_encrypted: encrypt(tokens.access_token),
          refresh_token_encrypted: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          token_expires_at: expiresAt,
          is_active: true,
          last_sync_at: new Date().toISOString(),
        }).eq('google_user_id', googleUser.id).eq('workspace_id', workspaceId)
      } else {
        logger.error('Failed to save Google connection', { error })
        return NextResponse.redirect(`${origin}/settings?error=google_auth_save_failed`)
      }
    }

    logger.info('Google account connected', { email: googleUser.email, workspaceId })

    return NextResponse.redirect(`${origin}/settings?success=google_connected&email=${googleUser.email}`)
  } catch (error) {
    logger.error('Google OAuth callback error', { error: String(error) })
    return NextResponse.redirect(`${new URL(request.url).origin}/settings?error=google_auth_failed`)
  }
}
