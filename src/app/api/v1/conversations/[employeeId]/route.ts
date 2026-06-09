import { NextRequest } from 'next/server'
import { ok, created, Errors } from '@/lib/utils/api'
import {
  getOrCreateConversation,
  loadMessages,
  saveMessage,
  listConversations,
} from '@/lib/db/chat'

const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001'

interface RouteParams {
  params: Promise<{ employeeId: string }>
}

/**
 * GET /api/v1/conversations/:employeeId
 * Returns the current conversation + its messages.
 * Query params:
 *   ?history=true  → returns all conversations (no messages)
 *   ?limit=50      → max messages to return (default 100)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { employeeId } = await params
    const { searchParams } = request.nextUrl
    const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID
    const historyOnly = searchParams.get('history') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    if (historyOnly) {
      const conversations = await listConversations(employeeId, workspaceId)
      return ok({ conversations })
    }

    const conversation = await getOrCreateConversation(employeeId, workspaceId)
    const messages = await loadMessages(conversation.id, limit)

    return ok({ conversation, messages })
  } catch (e) {
    return Errors.internal((e as Error).message)
  }
}

/**
 * POST /api/v1/conversations/:employeeId
 * Save a message to the current conversation.
 * Body: { role: 'user' | 'assistant', content: string, metadata?: object }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { employeeId } = await params
    const body = await request.json()
    const { role, content, metadata = {}, workspace_id } = body

    if (!role || !content) {
      return Errors.validation('role and content are required')
    }
    if (role !== 'user' && role !== 'assistant') {
      return Errors.validation('role must be "user" or "assistant"')
    }

    const workspaceId = workspace_id || DEFAULT_WORKSPACE_ID
    const conversation = await getOrCreateConversation(employeeId, workspaceId)
    const message = await saveMessage(conversation.id, workspaceId, role, content, metadata)

    return created({ message, conversation_id: conversation.id })
  } catch (e) {
    return Errors.internal((e as Error).message)
  }
}

/**
 * DELETE /api/v1/conversations/:employeeId
 * Clears history by creating a fresh conversation (old one stays in DB).
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { employeeId } = await params
    const { searchParams } = request.nextUrl
    const workspaceId = searchParams.get('workspace_id') || DEFAULT_WORKSPACE_ID

    // Create a brand new conversation — old one remains archived
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const db = createAdminClient()

    const { data: newConv, error } = await db
      .from('conversations')
      .insert({
        workspace_id: workspaceId,
        employee_id: employeeId,
        title: `Chat with ${employeeId} (new)`,
      })
      .select('*')
      .single()

    if (error || !newConv) return Errors.internal('Could not create new conversation')

    return ok({ conversation: newConv, cleared: true })
  } catch (e) {
    return Errors.internal((e as Error).message)
  }
}
