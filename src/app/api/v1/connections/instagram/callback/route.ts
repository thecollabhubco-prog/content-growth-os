import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) return NextResponse.redirect(`${origin}/publishing?error=instagram_denied`)
  if (!code) return NextResponse.redirect(`${origin}/publishing?error=instagram_missing_code`)

  let workspaceId = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
  try {
    const decoded = JSON.parse(Buffer.from(state || '', 'base64').toString('utf-8'))
    workspaceId = decoded.workspace_id || workspaceId
  } catch { /* use default */ }

  const appId = process.env.META_APP_ID!
  const appSecret = process.env.META_APP_SECRET!
  const redirectUri = `${origin}/api/v1/connections/instagram/callback`

  try {
    // Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }),
    })

    if (!tokenRes.ok) {
      logger.error('Meta token exchange failed', { status: tokenRes.status })
      return NextResponse.redirect(`${origin}/publishing?error=instagram_token_failed`)
    }

    const { access_token: shortToken } = await tokenRes.json()

    // Exchange for long-lived token (60 days)
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    )
    const longTokenData = await longTokenRes.json()
    const accessToken: string = longTokenData.access_token || shortToken
    const expiresIn: number = longTokenData.expires_in || 5184000 // 60 days

    // Get Facebook pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
    )
    const pagesData = await pagesRes.json()
    const pages: Array<{ id: string; name: string; access_token: string }> = pagesData.data || []

    if (pages.length === 0) {
      return NextResponse.redirect(`${origin}/publishing?error=instagram_no_pages`)
    }

    // Use first page (or let user pick later)
    const page = pages[0]

    // Get Instagram Business Account for this page
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()
    const igAccountId: string = igData.instagram_business_account?.id || ''

    if (!igAccountId) {
      return NextResponse.redirect(`${origin}/publishing?error=instagram_no_business_account`)
    }

    // Get Instagram account info
    const igProfileRes = await fetch(
      `https://graph.facebook.com/v19.0/${igAccountId}?fields=username,name&access_token=${page.access_token}`
    )
    const igProfile = await igProfileRes.json()
    const username: string = igProfile.username || 'instagram_account'
    const name: string = igProfile.name || username

    const db = createAdminClient()

    await db
      .from('platform_connections')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId)
      .eq('platform', 'instagram')

    const { error: insertError } = await db
      .from('platform_connections')
      .insert({
        workspace_id: workspaceId,
        platform: 'instagram',
        account_name: `@${username}`,
        account_id: igAccountId,
        account_url: `https://instagram.com/${username}`,
        credentials_encrypted: encrypt(JSON.stringify({
          accessToken: page.access_token,
          igAccountId,
          pageId: page.id,
        })) as unknown as import('@/types/database.types').Json,
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        is_active: true,
        connection_metadata: { name, username, page_id: page.id } as unknown as import('@/types/database.types').Json,
      })

    if (insertError) {
      logger.error('Failed to save Instagram connection', { insertError })
      return NextResponse.redirect(`${origin}/publishing?error=instagram_save_failed`)
    }

    logger.info('Instagram connected', { username, workspaceId })
    return NextResponse.redirect(`${origin}/publishing?success=instagram_connected&account=${encodeURIComponent('@' + username)}`)
  } catch (err) {
    logger.error('Instagram OAuth error', { err: String(err) })
    return NextResponse.redirect(`${origin}/publishing?error=instagram_auth_failed`)
  }
}
