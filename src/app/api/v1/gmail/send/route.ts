import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { GmailClient } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/oauth'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized()

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) return Errors.validation('x-workspace-id header required')

    const body = await request.json()
    const { to, subject, html_body, thread_id, cc, mode = 'send' } = body

    if (!to || !subject || !html_body) {
      return Errors.validation('to, subject, and html_body are required')
    }

    const db = createTypedAdminClient()
    const { data: connection } = await from(db, 'google_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!connection) return Errors.notFound('Google connection')

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
