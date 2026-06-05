import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { generateEmbedding } from './openrouter'
import { logger } from '@/lib/logger'

export async function buildKnowledgeContext(
  workspaceId: string,
  query: string,
  maxItems = 5
): Promise<string> {
  try {
    const db = createTypedAdminClient()

    const embedding = await generateEmbedding(query)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db as any).rpc('search_knowledge', {
      p_workspace_id: workspaceId,
      p_query_embedding: embedding,
      p_match_count: maxItems,
      p_match_threshold: 0.6,
    })

    if (error || !data?.length) {
      const { data: coreItems } = await from(db, 'knowledge_items')
        .select('type, title, content')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .in('type', ['brand_voice', 'business_info', 'writing_preference'])
        .limit(3)

      if (!coreItems?.length) return ''

      return (coreItems as { type: string; title: string; content: string }[])
        .map(item => `[${item.type.toUpperCase()}] ${item.title}:\n${item.content}`)
        .join('\n\n')
    }

    return (data as { type: string; title: string; chunk_text: string }[])
      .map(item => `[${item.type.toUpperCase()}] ${item.title}:\n${item.chunk_text}`)
      .join('\n\n')
  } catch (error) {
    logger.warn('Could not build knowledge context', { workspaceId, error })
    return ''
  }
}
