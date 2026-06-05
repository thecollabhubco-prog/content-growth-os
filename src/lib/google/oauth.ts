import { encrypt, decrypt } from '@/lib/encryption/tokens'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { logger } from '@/lib/logger'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  id_token: string
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    logger.error('Google token exchange failed', { error })
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
}> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  return response.json()
}

export async function getValidAccessToken(connectionId: string): Promise<string> {
  const db = createTypedAdminClient()
  const { data: conn } = await from(db, 'google_connections')
    .select('*')
    .eq('id', connectionId)
    .single()

  if (!conn) throw new Error('Google connection not found')

  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null
  const needsRefresh = !expiresAt || expiresAt <= new Date(Date.now() + 60_000)

  if (!needsRefresh && conn.access_token_encrypted) {
    return decrypt(conn.access_token_encrypted)
  }

  if (!conn.refresh_token_encrypted) {
    throw new Error('No refresh token available')
  }

  const refreshToken = decrypt(conn.refresh_token_encrypted)
  const tokens = await refreshAccessToken(refreshToken)

  const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await from(db, 'google_connections').update({
    access_token_encrypted: encrypt(tokens.access_token),
    token_expires_at: newExpiresAt,
    last_sync_at: new Date().toISOString(),
  }).eq('id', connectionId)

  return tokens.access_token
}

export async function getGoogleUserInfo(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new Error('Failed to get user info')
  return response.json() as Promise<{ id: string; email: string; name: string; picture: string }>
}
