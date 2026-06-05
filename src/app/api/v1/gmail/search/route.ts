import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'
import { GmailClient } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/oauth'
import { generate } from '@/lib/ai/openrouter'
import { logger } from '@/lib/logger'

// Natural language search — converts plain English to Gmail query syntax
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized()

    const workspaceId = request.headers.get('x-workspace-id')
    if (!workspaceId) return Errors.validation('x-workspace-id header required')

    const body = await request.json()
    const { query, natural_language = false, max_results = 20 } = body

    if (!query) return Errors.validation('query is required')

    let gmailQuery = query

    if (natural_language) {
      // Convert natural language to Gmail query syntax
      const result = await generate({
        model: 'anthropic/claude-3-haiku',
        systemPrompt: 'Convert natural language email search queries to Gmail search syntax. Return ONLY the Gmail query string, nothing else.',
        userPrompt: `Convert to Gmail search syntax: "${query}"\n\nExamples:\n- "unread emails from last week" → "is:unread newer_than:7d"\n- "emails from john about invoices" → "from:john subject:invoice"\n- "emails with attachments" → "has:attachment"\n\nReturn only the Gmail query string.`,
        maxTokens: 100,
        temperature: 0.1,
      })
      gmailQuery = result.content.trim().replace(/^["']|["']$/g, '')
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
