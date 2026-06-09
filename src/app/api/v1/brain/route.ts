import { NextRequest } from 'next/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, created, Errors } from '@/lib/utils/api'
import { generateEmbedding } from '@/lib/ai/openrouter'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {

  const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  const db = createTypedAdminClient()
  let query = from(db, 'knowledge_items')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (type) {
    query = query.eq('type', type)
  }

  const { data, error } = await query

  if (error) return Errors.internal()

  return ok(data)
}

export async function POST(request: NextRequest) {
  try {

    const workspaceId = request.headers.get('x-workspace-id') || '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

    const body = await request.json()
    const { type, title, content, tags, metadata } = body

    if (!type || !title || !content) {
      return Errors.validation('type, title, and content are required')
    }

    const db = createTypedAdminClient()
    const { data: item, error } = await from(db, 'knowledge_items')
      .insert({
        workspace_id: workspaceId,
        type,
        title,
        content,
        tags: tags || [],
        metadata: metadata || {},
        created_by: null,
      })
      .select()
      .single()

    if (error) return Errors.internal(error.message)

    embedKnowledgeItem(item.id, workspaceId, content).catch(err =>
      logger.error('Embedding failed', { itemId: item.id, error: String(err) })
    )

    return created(item)
  } catch (error) {
    return Errors.internal(String(error))
  }
}

async function embedKnowledgeItem(itemId: string, workspaceId: string, content: string) {
  const db = createTypedAdminClient()
  const chunkSize = 1000
  const chunks: string[] = []

  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize))
  }

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i])
    await from(db, 'knowledge_embeddings').insert({
      knowledge_item_id: itemId,
      workspace_id: workspaceId,
      embedding: embedding as unknown as string,
      chunk_index: i,
      chunk_text: chunks[i],
    })
  }

  logger.info('Knowledge item embedded', { itemId, chunks: chunks.length })
}
