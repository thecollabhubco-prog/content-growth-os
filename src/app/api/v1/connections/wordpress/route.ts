import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
// Stable identifier for this app in WordPress's Application Passwords UI —
// lets a site's admin recognize/manage the grant later. Arbitrary but fixed.
const APP_ID = '8f5c1a2e-6b3d-4f7a-9e21-b6a1c3d4e5f6'

function normalizeSiteUrl(raw: string): string | null {
  let url = raw.trim()
  if (!url) return null
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.host}`
  } catch {
    return null
  }
}

// GET /api/v1/connections/wordpress?site_url=...&workspace_id=...
// Sends the user to their own site's native "Authorize Application" screen
// (WP core, 5.6+) instead of asking them to create an Application Password
// by hand. They log in there with their normal wp-admin credentials — we
// never see the password — and approve the connection; WordPress generates
// the Application Password itself and hands it back via success_url.
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID
  const siteUrl = normalizeSiteUrl(searchParams.get('site_url') || '')

  if (!siteUrl) {
    return NextResponse.redirect(`${origin}/publishing?error=wordpress_invalid_site_url`)
  }

  const successUrl = `${origin}/api/v1/connections/wordpress/callback?workspace_id=${encodeURIComponent(workspaceId)}`
  const rejectUrl = `${origin}/publishing?error=wordpress_denied`

  const params = new URLSearchParams({
    app_name: 'Content Growth OS',
    app_id: APP_ID,
    success_url: successUrl,
    reject_url: rejectUrl,
  })

  return NextResponse.redirect(`${siteUrl}/wp-admin/authorize-application.php?${params}`)
}
