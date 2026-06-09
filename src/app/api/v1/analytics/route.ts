import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ok, Errors } from '@/lib/utils/api'

const DEFAULT_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export async function GET(request: NextRequest) {
  const workspaceId = request.headers.get('x-workspace-id') || DEFAULT_WORKSPACE_ID
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString()

  const db = createAdminClient()

  // All content items created in this period
  const { data: items, error } = await db
    .from('content_items')
    .select('id, platform, type, status, word_count, reading_time_minutes, created_at, published_at, tags')
    .eq('workspace_id', workspaceId)
    .gte('created_at', startStr)
    .order('created_at', { ascending: false })

  if (error) return Errors.internal(error.message)

  const all = items || []

  // ── By-platform breakdown ─────────────────────────────────────────────────
  const byPlatform: Record<string, {
    total: number
    published: number
    draft: number
    scheduled: number
    word_count: number
    types: string[]
  }> = {}

  for (const item of all) {
    const p = item.platform || 'internal'
    if (!byPlatform[p]) byPlatform[p] = { total: 0, published: 0, draft: 0, scheduled: 0, word_count: 0, types: [] }
    byPlatform[p].total++
    if (item.status === 'published') byPlatform[p].published++
    if (item.status === 'draft' || item.status === 'review') byPlatform[p].draft++
    if (item.status === 'scheduled') byPlatform[p].scheduled++
    byPlatform[p].word_count += item.word_count || 0
    if (!byPlatform[p].types.includes(item.type)) byPlatform[p].types.push(item.type)
  }

  // ── Status breakdown ──────────────────────────────────────────────────────
  const byStatus: Record<string, number> = {}
  for (const item of all) {
    byStatus[item.status] = (byStatus[item.status] || 0) + 1
  }

  // ── Daily output (last N days, grouped by date) ───────────────────────────
  const dailyMap: Record<string, number> = {}
  for (const item of all) {
    const d = item.created_at.slice(0, 10)
    dailyMap[d] = (dailyMap[d] || 0) + 1
  }
  // Build contiguous date array
  const daily: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    daily.push({ date: key, count: dailyMap[key] || 0 })
  }

  // ── Published items over time ─────────────────────────────────────────────
  const publishedItems = all.filter(i => i.status === 'published' && i.published_at)
  const publishedByDay: Record<string, number> = {}
  for (const item of publishedItems) {
    const d = item.published_at!.slice(0, 10)
    publishedByDay[d] = (publishedByDay[d] || 0) + 1
  }

  // ── Top tags ──────────────────────────────────────────────────────────────
  const tagCount: Record<string, number> = {}
  for (const item of all) {
    for (const tag of item.tags || []) {
      tagCount[tag] = (tagCount[tag] || 0) + 1
    }
  }
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalWords = all.reduce((s, i) => s + (i.word_count || 0), 0)
  const totalPublished = all.filter(i => i.status === 'published').length
  const totalGenerated = all.length
  const avgWordsPerPiece = totalGenerated > 0 ? Math.round(totalWords / totalGenerated) : 0

  // ── Publishing velocity (pieces per day) ─────────────────────────────────
  const velocity = +(totalGenerated / days).toFixed(2)

  return ok({
    period_days: days,
    totals: {
      generated: totalGenerated,
      published: totalPublished,
      words_written: totalWords,
      avg_words_per_piece: avgWordsPerPiece,
      pieces_per_day: velocity,
    },
    by_platform: byPlatform,
    by_status: byStatus,
    daily_output: daily,
    top_tags: topTags,
    recent_items: all.slice(0, 10).map(i => ({
      id: i.id,
      platform: i.platform,
      type: i.type,
      status: i.status,
      created_at: i.created_at,
    })),
  })
}
