import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/database.types'

type Conversation = Database['public']['Tables']['conversations']['Row']
type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
type MessageInsert = Database['public']['Tables']['chat_messages']['Insert']

// Default workspace ID — used when auth isn't wired yet
const DEFAULT_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Get an existing conversation or create a new one for this workspace+employee pair.
 * Returns the conversation row.
 */
export async function getOrCreateConversation(
  employeeId: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID,
  title?: string
): Promise<Conversation> {
  const db = createAdminClient()

  // Look for the most recent conversation for this employee in this workspace
  const { data: existing } = await db
    .from('conversations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('employee_id', employeeId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing

  // Create a new one
  const { data: created, error } = await db
    .from('conversations')
    .insert({
      workspace_id: workspaceId,
      employee_id: employeeId,
      title: title || `Chat with ${employeeId}`,
    })
    .select('*')
    .single()

  if (error || !created) throw new Error(`Failed to create conversation: ${error?.message}`)
  return created
}

/**
 * Save a single message to a conversation.
 */
export async function saveMessage(
  conversationId: string,
  workspaceId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<ChatMessage> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      workspace_id: workspaceId,
      role,
      content,
      metadata: metadata as MessageInsert['metadata'],
    })
    .select('*')
    .single()

  if (error || !data) throw new Error(`Failed to save message: ${error?.message}`)
  return data
}

/**
 * Load all messages for a conversation, oldest first.
 */
export async function loadMessages(
  conversationId: string,
  limit = 100
): Promise<ChatMessage[]> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`Failed to load messages: ${error.message}`)
  return data || []
}

/**
 * Load all conversations for a workspace+employee, newest first.
 */
export async function listConversations(
  employeeId: string,
  workspaceId: string = DEFAULT_WORKSPACE_ID
): Promise<Conversation[]> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('conversations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('employee_id', employeeId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Failed to list conversations: ${error.message}`)
  return data || []
}

/**
 * Save both user message + assistant reply in one call (atomic-ish).
 * Returns [userMsg, assistantMsg].
 */
export async function saveExchange(
  conversationId: string,
  workspaceId: string,
  userContent: string,
  assistantContent: string,
  metadata: Record<string, unknown> = {}
): Promise<[ChatMessage, ChatMessage]> {
  const [userMsg, assistantMsg] = await Promise.all([
    saveMessage(conversationId, workspaceId, 'user', userContent),
    saveMessage(conversationId, workspaceId, 'assistant', assistantContent, metadata),
  ])
  return [userMsg, assistantMsg]
}
