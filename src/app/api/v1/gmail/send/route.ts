import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'
import { GmailClient } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/oauth'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const body = await request.json()
    const { to, subject, html_body, thread_id, cc, mode = 'send' } = body

    if (!to || !subject || !html_body) {
      return Errors.validation('to, subject, and html_body are required')
    }

    const db = createAdminClient()
    const { data: connection } = await db
      .from('google_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('last_sync_at', { ascending: false })
      .limit(1)
      .single()

    if (!connection) {
      return Errors.notFound('Google connection. Connect Gmail in Publishing settings.')
    }

    const accessToken = await getValidAccessToken(connection.id)
    const gmail = new GmailClient(accessToken)

    const params = {
      to: Array.isArray(to) ? to : [to],
      subject,
      body: html_body,
      threadId: thread_id,
      cc: cc || [],
    }

    const result = mode === 'draft'
      ? await gmail.createDraft(params)
      : await gmail.sendEmail(params)

    logger.info('Gmail email action', { mode, to, workspaceId })
    return ok({ result, mode })
  } catch (error) {
    logger.error('Gmail send error', { error: String(error) })
    return Errors.externalApi(String(error))
  }
}
