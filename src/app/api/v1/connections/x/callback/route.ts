import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) return NextResponse.redirect(`${origin}/publishing?error=x_denied`)
  if (!code) return NextResponse.redirect(`${origin}/publishing?error=x_missing_code`)

  let workspaceId = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
  let codeVerifier = ''
  try {
    const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString('utf-8'))
    workspaceId = decoded.workspace_id || workspaceId
    codeVerifier = decoded.code_verifier || ''
  } catch { /* use defaults */ }

  const clientId = process.env.X_CLIENT_ID!
  const clientSecret = process.env.X_CLIENT_SECRET!
  const redirectUri = `${origin}/api/v1/connections/x/callback`

  try {
    // Exchange code for access token (PKCE)
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      logger.error('X token exchange failed', { err })
      return NextResponse.redirect(`${origin}/publishing?error=x_token_failed`)
    }

    const tokens = await tokenRes.json()
    const accessToken: string = tokens.access_token
    const refreshToken: string = tokens.refresh_token || ''
    const expiresIn: number = tokens.expires_in || 7200

    // Get user info
    const userRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    const userId: string = userData.data?.id || ''
    const username: string = userData.data?.username || 'X Account'
    const name: string = userData.data?.name || username

    const db = createAdminClient()

    await db
      .from('platform_connections')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId)
      .eq('platform', 'x')

    const { error: insertError } = await db
      .from('platform_connections')
      .insert({
        workspace_id: workspaceId,
        platform: 'x',
        account_name: `@${username}`,
        account_id: userId,
        account_url: `https://x.com/${username}`,
        credentials_encrypted: encrypt(JSON.stringify({
          accessToken,
          refreshToken,
          accessTokenSecret: '', // OAuth 2.0 doesn't use secret
          userId,
        })) as unknown as import('@/types/database.types').Json,
        scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        is_active: true,
        connection_metadata: { name, username } as unknown as import('@/types/database.types').Json,
      })

    if (insertError) {
      logger.error('Failed to save X connection', { insertError })
      return NextResponse.redirect(`${origin}/publishing?error=x_save_failed`)
    }

    logger.info('X connected', { username, workspaceId })
    return NextResponse.redirect(`${origin}/publishing?success=x_connected&account=${encodeURIComponent('@' + username)}`)
  } catch (err) {
    logger.error('X OAuth error', { err: String(err) })
    return NextResponse.redirect(`${origin}/publishing?error=x_auth_failed`)
  }
}
