import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(`${origin}/publishing?error=linkedin_denied`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/publishing?error=linkedin_missing_code`)
  }

  let workspaceId = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
  try {
    const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString('utf-8'))
    workspaceId = decoded.workspace_id || workspaceId
  } catch { /* use default */ }

  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!
  const redirectUri = `${origin}/api/v1/connections/linkedin/callback`

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      logger.error('LinkedIn token exchange failed', { err })
      return NextResponse.redirect(`${origin}/publishing?error=linkedin_token_failed`)
    }

    const tokens = await tokenRes.json()
    const accessToken: string = tokens.access_token
    const expiresIn: number = tokens.expires_in || 5184000 // 60 days default

    // Get user's person ID via OpenID userinfo
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const profile = await profileRes.json()
    const personId: string = profile.sub   // OpenID sub = person URN id
    const name: string = profile.name || profile.email || 'LinkedIn Account'
    const email: string = profile.email || ''

    const db = createAdminClient()

    // Deactivate old connection
    await db
      .from('platform_connections')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId)
      .eq('platform', 'linkedin')

    // Store new connection
    const { error: insertError } = await db
      .from('platform_connections')
      .insert({
        workspace_id: workspaceId,
        platform: 'linkedin',
        account_name: name,
        account_id: personId,
        account_url: `https://linkedin.com/in/${personId}`,
        credentials_encrypted: encrypt(JSON.stringify({
          accessToken,
          personId,
        })) as unknown as import('@/types/database.types').Json,
        scopes: ['openid', 'profile', 'w_member_social'],
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        is_active: true,
        connection_metadata: { email } as unknown as import('@/types/database.types').Json,
      })

    if (insertError) {
      logger.error('Failed to save LinkedIn connection', { insertError })
      return NextResponse.redirect(`${origin}/publishing?error=linkedin_save_failed`)
    }

    logger.info('LinkedIn connected', { name, workspaceId })
    return NextResponse.redirect(`${origin}/publishing?success=linkedin_connected&account=${encodeURIComponent(name)}`)
  } catch (err) {
    logger.error('LinkedIn OAuth error', { err: String(err) })
    return NextResponse.redirect(`${origin}/publishing?error=linkedin_auth_failed`)
  }
}
