import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, created, Errors } from '@/lib/utils/api'
import { performResearch } from '@/lib/research/pipeline'
import { logger } from '@/lib/logger'

// Research does live web search + LLM synthesis — allow up to 60s.
export const maxDuration = 60

export async function GET(request: NextRequest) {

  const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

  const db = createTypedAdminClient()
  const { data, error } = await from(db, 'research_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return Errors.internal()
  return ok(data)
}

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { title, input_type, input_data } = body

    if (!title || !input_type || !input_data) {
      return Errors.validation('title, input_type, and input_data are required')
    }

    // Run synchronously and return the completed brief. (Was fire-and-forget,
    // which serverless killed before it finished → sessions hung on "running".)
    const outcome = await performResearch(workspaceId, title, input_type, input_data)

    if (outcome.status === 'failed') {
      return Errors.internal(outcome.error || 'Research failed')
    }
    return created({ session_id: outcome.sessionId, status: 'completed', summary: outcome.summary, brief: outcome.brief })
  } catch (error) {
    logger.error('Research route error', { error: String(error) })
    return Errors.internal(String(error))
  }
}
