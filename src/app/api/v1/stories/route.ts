import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'
import { logger } from '@/lib/logger'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// Stories are stored as knowledge_items with type 'personal_story'
// title = question_id, content = full Q+A, metadata = { question_id, question, category }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspace_id')
    || request.headers.get('x-workspace-id')
    || DEFAULT_WORKSPACE_ID

  const db = createAdminClient()
  const { data: items, error } = await db
    .from('knowledge_items')
    .select('id, title, content, metadata, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('type', 'personal_story')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return Errors.internal(error.message)

  const stories = (items || []).map(item => {
    const meta = item.metadata as Record<string, unknown>
    return {
      id: item.id,
      question_id: meta?.question_id || item.title,
      question: meta?.question || '',
      category: meta?.category || '',
      answer: item.content,
      created_at: item.created_at,
    }
  })

  return ok({ stories })
}

export async function POST(request: NextRequest) {
  try {
    const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
    const body = await request.json()
    const { question_id, question, answer, category } = body

    if (!question_id || !answer?.trim()) {
      return Errors.validation('question_id and answer are required')
    }

    const db = createAdminClient()

    // Check if story already exists (upsert by question_id)
    const { data: existing } = await db
      .from('knowledge_items')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('type', 'personal_story')
      .eq('title', question_id)
      .single()

    const fullContent = `Q: ${question}\n\nA: ${answer}`
    const metadata = { question_id, question, category }

    if (existing) {
      await db
        .from('knowledge_items')
        .update({ content: fullContent, metadata, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await db
        .from('knowledge_items')
        .insert({
          workspace_id: workspaceId,
          type: 'personal_story',
          title: question_id,
          content: fullContent,
          metadata,
          tags: ['personal-story', category?.toLowerCase().replace(/\s+/g, '-') || 'story'],
          is_active: true,
        })
    }

    logger.info('Story saved', { workspace_id: workspaceId, question_id })
    return ok({ saved: true, question_id })
  } catch (error) {
    logger.error('Story save error', { error: String(error) })
    return Errors.internal(String(error))
  }
}
