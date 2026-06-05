'use client'

import { useState, useEffect } from 'react'
import { formatNumber } from '@/lib/utils'

type PlatformMetrics = {
  impressions: number
  reach: number
  clicks: number
  likes: number
  comments: number
  shares: number
  posts: number
  avg_engagement_rate: number
}

type AnalyticsData = {
  period_days: number
  by_platform: Record<string, PlatformMetrics>
  total_published: number
}

const platformConfig: Record<string, { label: string; icon: string; color: string }> = {
  blog: { label: 'Blog', icon: '📝', color: 'text-blue-400' },
  linkedin: { label: 'LinkedIn', icon: '💼', color: 'text-sky-400' },
  x: { label: 'X / Twitter', icon: '𝕏', color: 'text-zinc-400' },
  instagram: { label: 'Instagram', icon: '📸', color: 'text-pink-400' },
  youtube: { label: 'YouTube', icon: '▶️', color: 'text-red-400' },
  email: { label: 'Email', icon: '📨', color: 'text-green-400' },
}

const PERIODS = [7, 30, 90]

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { loadAnalytics() }, [period])

  async function loadAnalytics() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/analytics?days=${period}`, {
        headers: { 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }

  const platforms = Object.entries(data?.by_platform || {})

  const totals = platforms.reduce((acc, [, metrics]) => ({
    impressions: acc.impressions + metrics.impressions,
    reach: acc.reach + metrics.reach,
    clicks: acc.clicks + metrics.clicks,
    engagement: acc.engagement + metrics.likes + metrics.comments + metrics.shares,
  }), { impressions: 0, reach: 0, clicks: 0, engagement: 0 })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Cross-platform performance</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${period === p ? 'bg-[var(--primary)] text-white' : 'border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
            >
              {p}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Impressions', value: totals.impressions, icon: '👁' },
          { label: 'Total Reach', value: totals.reach, icon: '📡' },
          { label: 'Total Clicks', value: totals.clicks, icon: '🖱️' },
          { label: 'Total Engagement', value: totals.engagement, icon: '💬' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-xl mb-2">{card.icon}</div>
            <div className="text-xl font-bold">{loading ? '...' : formatNumber(card.value)}</div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Platform Breakdown */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">By Platform</h2>
        {loading ? (
          <div className="text-center text-sm text-[var(--muted-foreground)] py-8">Loading analytics...</div>
        ) : platforms.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">📊</div>
            <p className="text-sm font-medium mb-1">No analytics data yet</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Publish content and connect your platforms to start tracking performance.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {platforms.map(([platform, metrics]) => {
              const config = platformConfig[platform] || { label: platform, icon: '📊', color: 'text-[var(--foreground)]' }
              return (
                <div key={platform} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-lg">{config.icon}</span>
                    <span className={`font-medium text-sm ${config.color}`}>{config.label}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-auto">{metrics.posts} posts</span>
                  </div>
                  <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                    {[
                      { label: 'Impressions', value: metrics.impressions },
                      { label: 'Reach', value: metrics.reach },
                      { label: 'Clicks', value: metrics.clicks },
                      { label: 'Likes', value: metrics.likes },
                      { label: 'Comments', value: metrics.comments },
                      { label: 'Shares', value: metrics.shares },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <div className="font-semibold text-sm">{formatNumber(m.value)}</div>
                        <div className="text-[10px] text-[var(--muted-foreground)]">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  {metrics.avg_engagement_rate > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--muted-foreground)]">Avg engagement rate</span>
                        <div className="flex-1 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] rounded-full"
                            style={{ width: `${Math.min(metrics.avg_engagement_rate * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{(metrics.avg_engagement_rate * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Content Published */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm">Content published in last {period} days</div>
            <div className="text-2xl font-bold mt-1">{data?.total_published || 0}</div>
          </div>
          <div className="text-3xl">🚀</div>
        </div>
      </div>
    </div>
  )
}
