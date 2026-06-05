import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { GmailClient } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/oauth'
import { generate } from '@/lib/ai/openrouter'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized()

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) return Errors.validation('x-workspace-id header required')

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const maxResults = parseInt(searchParams.get('limit') || '20')
    const pageToken = searchParams.get('page_token') || undefined
    const unreadOnly = searchParams.get('unread') === 'true'

    const db = createTypedAdminClient()
    const { data: connection } = await from(db, 'google_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!connection) {
      return Errors.notFound('Google connection. Connect Gmail in Settings.')
    }

    const accessToken = await getValidAccessToken(connection.id)
    const gmail = new GmailClient(accessToken)

    const query = [
      q,
      unreadOnly ? 'is:unread' : '',
    ].filter(Boolean).join(' ')

    const { threads = [], nextPageToken } = await gmail.listThreads({
      q: query || undefined,
      maxResults,
      pageToken,
      labelIds: ['INBOX'],
    })

    // Fetch thread details in parallel (up to 10)
    const threadDetails = await Promise.allSettled(
      threads.slice(0, 10).map(t => gmail.getThread(t.id))
    )

    const formattedThreads = threadDetails
      .filter(r => r.status === 'fulfilled')
      .map(r => {
        const thread = (r as PromiseFulfilledResult<Awaited<ReturnType<GmailClient['getThread']>>>).value
        const lastMsg = thread.messages[thread.messages.length - 1]
        return {
          id: thread.id,
          subject: GmailClient.extractHeader(lastMsg, 'Subject') || '(no subject)',
          from: GmailClient.extractHeader(lastMsg, 'From'),
          date: lastMsg.internalDate,
          snippet: lastMsg.snippet,
          labels: lastMsg.labelIds || [],
          message_count: thread.messages.length,
          is_unread: lastMsg.labelIds?.includes('UNREAD') || false,
          is_starred: lastMsg.labelIds?.includes('STARRED') || false,
          has_attachment: lastMsg.payload.parts?.some(p => p.mimeType?.includes('application')) || false,
        }
      })

    return ok(formattedThreads, { total: formattedThreads.length })
  } catch (error) {
    logger.error('Gmail list threads error', { error: String(error) })
    return Errors.externalApi(String(error))
  }
}
