import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encrypt } from '@/lib/encryption/tokens'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// GET /api/v1/connections/wordpress/callback — WordPress redirects here after
// the user approves on their own site, appending site_url/user_login/password
// (a freshly generated Application Password) as query params.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID
  const siteUrl = searchParams.get('site_url')
  const username = searchParams.get('user_login')
  const password = searchParams.get('password')

  if (!siteUrl || !username || !password) {
    return NextResponse.redirect(`${origin}/publishing?error=wordpress_denied`)
  }

  const cleanSiteUrl = siteUrl.replace(/\/$/, '')

  // Confirm the credentials WordPress just generated actually work before saving.
  try {
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    const check = await fetch(`${cleanSiteUrl}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: authHeader },
    })
    if (!check.ok) {
      logger.error('WordPress authorize callback: credential check failed', { status: check.status })
      return NextResponse.redirect(`${origin}/publishing?error=wordpress_invalid_credentials`)
    }
  } catch (err) {
    logger.error('WordPress authorize callback: credential check errored', { err: String(err) })
    return NextResponse.redirect(`${origin}/publishing?error=wordpress_verify_failed`)
  }

  const db = createAdminClient()

  await db
    .from('platform_connections')
    .update({ is_active: false })
    .eq('workspace_id', workspaceId)
    .eq('platform', 'wordpress')

  const { error } = await db
    .from('platform_connections')
    .insert({
      workspace_id: workspaceId,
      platform: 'wordpress',
      account_name: username,
      account_url: cleanSiteUrl,
      credentials_encrypted: encrypt(JSON.stringify({
        siteUrl: cleanSiteUrl,
        username,
        applicationPassword: password,
      })) as unknown as import('@/types/database.types').Json,
      is_active: true,
    })

  if (error) {
    logger.error('Failed to save WordPress connection', { error })
    return NextResponse.redirect(`${origin}/publishing?error=wordpress_save_failed`)
  }

  logger.info('WordPress connected via authorize-application', { username, workspaceId })
  return NextResponse.redirect(`${origin}/publishing?success=wordpress_connected&account=${encodeURIComponent(username)}`)
}
