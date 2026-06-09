import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/oauth'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function GET(request: NextRequest) {
  const { origin, searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(`${origin}/publishing?error=google_missing_client_id`)
  }

  const state = Buffer.from(JSON.stringify({ workspace_id: workspaceId })).toString('base64')
  const authUrl = getGoogleAuthUrl(state)

  return NextResponse.redirect(authUrl)
}
