import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// GET /api/v1/connections/instagram → start Meta OAuth
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID

  const appId = process.env.META_APP_ID
  if (!appId) {
    return NextResponse.redirect(`${origin}/publishing?error=instagram_missing_app_id`)
  }

  const redirectUri = `${origin}/api/v1/connections/instagram/callback`
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64')

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement',
    response_type: 'code',
    state,
  })

  return NextResponse.redirect(`https://www.facebook.com/dialog/oauth?${params}`)
}
