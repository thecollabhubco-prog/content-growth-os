import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// GET /api/v1/connections/x → start OAuth 2.0 PKCE flow
export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID

  const clientId = process.env.X_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${origin}/publishing?error=x_missing_client_id`)
  }

  const redirectUri = `${origin}/api/v1/connections/x/callback`

  // Generate PKCE code verifier + challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  // Encode state: workspace_id + code_verifier
  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId, code_verifier: codeVerifier })).toString('base64')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`)
}
