import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'
import { GmailClient } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/oauth'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function GET(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const maxResults = parseInt(searchParams.get('limit') || '20')
    const pageToken = searchParams.get('page_token') || undefined
    const unreadOnly = searchParams.get('unread') === 'true'

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

    const query = [q, unreadOnly ? 'is:unread' : ''].filter(Boolean).join(' ')

    const { threads = [], nextPageToken } = await gmail.listThreads({
      q: query || undefined,
      maxResults,
      pageToken,
      labelIds: ['INBOX'],
    })

    const threadDetails = await Promise.allSettled(
      threads.slice(0, 15).map(t => gmail.getThread(t.id))
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
          has_attachment: lastMsg.payload.parts?.some((p: { mimeType?: string }) => p.mimeType?.includes('application')) || false,
        }
      })

    return ok(formattedThreads, { total: formattedThreads.length })
  } catch (error) {
    logger.error('Gmail list threads error', { error: String(error) })
    return Errors.externalApi(String(error))
  }
}
