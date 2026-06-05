import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTypedAdminClient, from } from '@/lib/supabase/typed'
import { ok, Errors } from '@/lib/utils/api'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Errors.unauthorized()

  const workspaceId = request.headers.get('x-workspace-id')
  if (!workspaceId) return Errors.validation('x-workspace-id header required')

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get('platform')
  const days = parseInt(searchParams.get('days') || '30')

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startStr = startDate.toISOString().split('T')[0]

  const db = createTypedAdminClient()

  // Get performance data
  let query = from(db, 'content_performance')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('metrics_date', startStr)
    .order('metrics_date', { ascending: false })

  if (platform) query = query.eq('platform', platform)

  const { data: performance, error } = await query
  if (error) return Errors.internal()

  // Aggregate by platform
  const byPlatform: Record<string, {
    impressions: number
    reach: number
    clicks: number
    likes: number
    comments: number
    shares: number
    posts: number
    avg_engagement_rate: number
  }> = {}

  for (const row of (performance || [])) {
    const p = row.platform
    if (!byPlatform[p]) {
      byPlatform[p] = { impressions: 0, reach: 0, clicks: 0, likes: 0, comments: 0, shares: 0, posts: 0, avg_engagement_rate: 0 }
    }
    byPlatform[p].impressions += row.impressions
    byPlatform[p].reach += row.reach
    byPlatform[p].clicks += row.clicks
    byPlatform[p].likes += row.likes
    byPlatform[p].comments += row.comments
    byPlatform[p].shares += row.shares
    byPlatform[p].posts += 1
    byPlatform[p].avg_engagement_rate += row.engagement_rate || 0
  }

  // Average engagement rate
  for (const p of Object.keys(byPlatform)) {
    if (byPlatform[p].posts > 0) {
      byPlatform[p].avg_engagement_rate /= byPlatform[p].posts
    }
  }

  // Get published content count
  const { data: contentCount } = await from(db, 'content_items')
    .select('platform, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'published')
    .gte('published_at', startDate.toISOString())

  return ok({
    period_days: days,
    by_platform: byPlatform,
    total_published: contentCount?.length || 0,
    raw_performance: performance?.slice(0, 100),
  })
}
