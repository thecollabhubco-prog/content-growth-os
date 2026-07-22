import { createAdminClient } from '@/lib/supabase/admin'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { generateEmbedding } from './openrouter'
import { logger } from '@/lib/logger'
import { getWorkspace } from '@/lib/workspace/workspaces'

const PERSONAL_BRAND_ID = 'personal-brand'

async function fetchKnowledgeForWorkspace(
  workspaceId: string,
  query: string,
  maxItems: number
): Promise<string> {
  const db = createTypedAdminClient()

  try {
    const embedding = await generateEmbedding(query)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any).rpc('search_knowledge', {
      p_workspace_id: workspaceId,
      p_query_embedding: embedding,
      p_match_count: maxItems,
      p_match_threshold: 0.6,
    })

    if (!error && data?.length) {
      return (data as { type: string; title: string; chunk_text: string }[])
        .map(item => `[${item.type.toUpperCase()}] ${item.title}:\n${item.chunk_text}`)
        .join('\n\n')
    }
  } catch { /* fall through to core items */ }

  // Fallback: fetch core items directly
  const { data: coreItems } = await from(db, 'knowledge_items')
    .select('type, title, content')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .in('type', ['brand_voice', 'business_info', 'writing_preference', 'audience_persona', 'offer', 'service', 'case_study'])
    .limit(maxItems)

  if (!coreItems?.length) return ''

  return (coreItems as { type: string; title: string; content: string }[])
    .map(item => `[${item.type.toUpperCase()}] ${item.title}:\n${item.content}`)
    .join('\n\n')
}

async function fetchPersonalStories(
  workspaceIds: string[],
  maxStories = 3
): Promise<string> {
  const db = createAdminClient()
  const allStories: string[] = []

  for (const wsId of workspaceIds) {
    const { data } = await db
      .from('knowledge_items')
      .select('content, metadata')
      .eq('workspace_id', wsId)
      .eq('type', 'personal_story')
      .eq('is_active', true)
      .limit(maxStories)

    if (data?.length) {
      allStories.push(...(data as { content: string; metadata: unknown }[]).map(s => `[PERSONAL STORY]\n${s.content}`))
    }
  }

  return allStories.slice(0, maxStories).join('\n\n')
}

export async function buildKnowledgeContext(
  workspaceId: string,
  query: string,
  maxItems = 5
): Promise<string> {
  try {
    const workspace = getWorkspace(workspaceId)
    const parts: string[] = []

    if (workspace.isPersonalBrand && workspace.sourceWorkspaceIds?.length) {
      // Personal Brand mode: pull from all source workspaces
      for (const sourceId of workspace.sourceWorkspaceIds) {
        const sourceWorkspace = getWorkspace(sourceId)
        const ctx = await fetchKnowledgeForWorkspace(sourceId, query, 3)
        if (ctx) {
          parts.push(`=== ${sourceWorkspace.name} Context ===\n${ctx}`)
        }
      }
      // Always include personal stories in personal brand mode
      const stories = await fetchPersonalStories(workspace.sourceWorkspaceIds, 3)
      if (stories) parts.push(`=== Personal Stories ===\n${stories}`)
    } else {
      // Standard single-workspace mode
      const ctx = await fetchKnowledgeForWorkspace(workspaceId, query, maxItems)
      if (ctx) parts.push(ctx)

      // Always append personal stories if they exist
      const stories = await fetchPersonalStories([workspaceId], 2)
      if (stories) parts.push(stories)
    }

    return parts.join('\n\n')
  } catch (error) {
    logger.warn('Could not build knowledge context', { workspaceId, error })
    return ''
  }
}

// Build full system context for a workspace (used by Business Memory feature)
export async function buildWorkspaceSystemContext(workspaceId: string): Promise<string> {
  if (workspaceId === PERSONAL_BRAND_ID) return buildKnowledgeContext(workspaceId, '', 6)
  return fetchKnowledgeForWorkspace(workspaceId, '', 8)
}
