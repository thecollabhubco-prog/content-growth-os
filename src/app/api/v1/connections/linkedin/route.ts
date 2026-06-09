import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// GET /api/v1/connections/linkedin → start OAuth
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID

  const clientId = process.env.LINKEDIN_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${origin}/publishing?error=linkedin_missing_client_id`)
  }

  const redirectUri = `${origin}/api/v1/connections/linkedin/callback`
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'openid profile w_member_social',
  })

  return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`)
}
