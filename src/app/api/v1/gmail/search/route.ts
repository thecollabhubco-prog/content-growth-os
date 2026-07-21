import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'
import { GmailClient } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/oauth'
import { generate } from '@/lib/ai/openrouter'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// Natural language search â€” converts plain English to Gmail query syntax
export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const body = await request.json()
    const { query, natural_language = false, max_results = 20 } = body

    if (!query) return Errors.validation('query is required')

    let gmailQuery = query as string

    if (natural_language) {
      const result = await generate({
        model: 'openai/gpt-oss-20b:free',
        systemPrompt: 'Convert natural language email search queries to Gmail search syntax. Return ONLY the Gmail query string, nothing else. No explanation.',
        userPrompt: `Convert to Gmail search syntax: "${query}"\n\nExamples:\n- "unread emails from last week" â†’ "is:unread newer_than:7d"\n- "emails from john about invoices" â†’ "from:john subject:invoice"\n- "emails with attachments" â†’ "has:attachment"\n\nReturn only the Gmail query string.`,
        maxTokens: 100,
        temperature: 0.1,
      })
      gmailQuery = result.content.trim().replace(/^["']|["']$/g, '')
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

    const { threads = [], nextPageToken } = await gmail.listThreads({
      q: gmailQuery,
      maxResults: max_results,
    })

    const threadDetails = await Promise.allSettled(
      threads.slice(0, 10).map(t => gmail.getThread(t.id))
    )

    const results = threadDetails
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
          message_count: thread.messages.length,
        }
      })

    return ok({ gmail_query: gmailQuery, results, next_page_token: nextPageToken })
  } catch (error) {
    logger.error('Gmail search error', { error: String(error) })
    return Errors.externalApi(String(error))
  }
}
