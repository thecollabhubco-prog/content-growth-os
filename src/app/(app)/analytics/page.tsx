'use client'

import { useState, useEffect } from 'react'
import { formatNumber } from '@/lib/utils'

type DailyPoint = { date: string; count: number }
type PlatformData = {
  total: number
  published: number
  draft: number
  scheduled: number
  word_count: number
}
type AnalyticsData = {
  period_days: number
  totals: {
    generated: number
    published: number
    words_written: number
    avg_words_per_piece: number
    pieces_per_day: number
  }
  by_platform: Record<string, PlatformData>
  by_status: Record<string, number>
  daily_output: DailyPoint[]
  top_tags: { tag: string; count: number }[]
  recent_items: { id: string; platform: string | null; type: string; status: string; created_at: string }[]
}

const WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'
const PERIODS = [7, 30, 90]

const platformConfig: Record<string, { label: string; icon: string; bg: string; bar: string }> = {
  blog:      { label: 'Blog',      icon: '📝', bg: 'bg-blue-500/10',   bar: 'bg-blue-500' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', bg: 'bg-sky-500/10',    bar: 'bg-sky-500' },
  x:         { label: 'X',         icon: '𝕏',  bg: 'bg-zinc-500/10',   bar: 'bg-zinc-400' },
  instagram: { label: 'Instagram', icon: '📸', bg: 'bg-pink-500/10',   bar: 'bg-pink-500' },
  youtube:   { label: 'YouTube',   icon: '▶️', bg: 'bg-red-500/10',    bar: 'bg-red-500' },
  email:     { label: 'Email',     icon: '📨', bg: 'bg-green-500/10',  bar: 'bg-green-500' },
  internal:  { label: 'Internal',  icon: '🗂️', bg: 'bg-purple-500/10', bar: 'bg-purple-500' },
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  draft:     { label: 'Draft',     color: 'text-zinc-400',   dot: 'bg-zinc-400' },
  review:    { label: 'In Review', color: 'text-yellow-400', dot: 'bg-yellow-400' },
  approved:  { label: 'Approved',  color: 'text-blue-400',   dot: 'bg-blue-400' },
  scheduled: { label: 'Scheduled', color: 'text-purple-400', dot: 'bg-purple-400' },
  published: { label: 'Published', color: 'text-emerald-400',dot: 'bg-emerald-400' },
  archived:  { label: 'Archived',  color: 'text-zinc-500',   dot: 'bg-zinc-500' },
  failed:    { label: 'Failed',    color: 'text-red-400',    dot: 'bg-red-400' },
}

function MiniBarChart({ data }: { data: DailyPoint[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const nonZero = data.filter(d => d.count > 0).length
  return (
    <div className="flex items-end gap-0.5 h-16 w-full">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm transition-all group relative"
          style={{
            height: `${Math.max((d.count / max) * 100, d.count > 0 ? 8 : 2)}%`,
            background: d.count > 0 ? 'var(--primary)' : 'var(--border)',
            opacity: d.count > 0 ? 0.8 : 0.3,
          }}
          title={`${d.date}: ${d.count} piece${d.count !== 1 ? 's' : ''}`}
        />
      ))}
      {nonZero === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--muted-foreground)]">
          No content yet
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(30)

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/analytics?days=${period}`, {
        headers: { 'x-workspace-id': WORKSPACE_ID },
      })
      const json = await res.json()
      if (json.success) setData(json.data)
    } finally {
      setLoading(false)
    }
  }

  const platforms = Object.entries(data?.by_platform || {}).sort((a, b) => b[1].total - a[1].total)
  const statuses = Object.entries(data?.by_status || {}).sort((a, b) => b[1] - a[1])
  const maxPlatform = Math.max(...platforms.map(([, m]) => m.total), 1)
  const totalStatusCount = statuses.reduce((s, [, v]) => s + v, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Real content output from your AI team</p>
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
          <button
            onClick={load}
            className="text-xs px-3 py-1.5 border border-[var(--border)] rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
          >
            ↻
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Pieces Generated', value: data?.totals.generated ?? 0, icon: '✍️', suffix: '' },
          { label: 'Published', value: data?.totals.published ?? 0, icon: '🚀', suffix: '' },
          { label: 'Words Written', value: data?.totals.words_written ?? 0, icon: '📄', suffix: '' },
          { label: 'Avg Words/Piece', value: data?.totals.avg_words_per_piece ?? 0, icon: '📏', suffix: '' },
          { label: 'Pieces/Day', value: data?.totals.pieces_per_day ?? 0, icon: '⚡', suffix: '' },
        ].map(card => (
          <div key={card.label} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <div className="text-xl mb-2">{card.icon}</div>
            <div className="text-xl font-bold">{loading ? '—' : formatNumber(card.value)}</div>
            <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-tight">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Daily Output Chart */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm">Daily Output</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Pieces created per day over last {period} days</p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{period}d</span>
        </div>
        {loading ? (
          <div className="h-16 bg-[var(--muted)] rounded animate-pulse" />
        ) : (
          <div className="relative">
            <MiniBarChart data={data?.daily_output || []} />
            {data && data.daily_output.length > 0 && (
              <div className="flex justify-between mt-2 text-[10px] text-[var(--muted-foreground)]">
                <span>{data.daily_output[0]?.date}</span>
                <span>{data.daily_output[data.daily_output.length - 1]?.date}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform + Status side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* By Platform */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Output by Platform</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-[var(--muted)] rounded animate-pulse" />)}</div>
          ) : platforms.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No content generated yet</p>
          ) : (
            <div className="space-y-3">
              {platforms.map(([platform, metrics]) => {
                const cfg = platformConfig[platform] || { label: platform, icon: '📊', bg: 'bg-zinc-500/10', bar: 'bg-zinc-400' }
                const pct = (metrics.total / maxPlatform) * 100
                return (
                  <div key={platform}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cfg.icon}</span>
                        <span className="text-xs font-medium">{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <span className="text-emerald-400">{metrics.published} pub</span>
                        <span>·</span>
                        <span>{metrics.total} total</span>
                        {metrics.word_count > 0 && <span className="hidden lg:inline">· {formatNumber(metrics.word_count)}w</span>}
                      </div>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* By Status */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-4">Content Pipeline</h2>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-[var(--muted)] rounded animate-pulse" />)}</div>
          ) : statuses.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-6">No content in pipeline</p>
          ) : (
            <div className="space-y-3">
              {statuses.map(([status, count]) => {
                const cfg = statusConfig[status] || { label: status, color: 'text-zinc-400', dot: 'bg-zinc-400' }
                const pct = totalStatusCount > 0 ? (count / totalStatusCount) * 100 : 0
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">{count} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Tags */}
      {!loading && (data?.top_tags?.length ?? 0) > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <h2 className="font-semibold text-sm mb-3">Top Content Tags</h2>
          <div className="flex flex-wrap gap-2">
            {data!.top_tags.map(({ tag, count }) => (
              <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                {tag} <span className="opacity-60">× {count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent Items */}
      {!loading && (data?.recent_items?.length ?? 0) > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm">Recent Content</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {data!.recent_items.map(item => {
              const cfg = platformConfig[item.platform || 'internal'] || platformConfig.internal
              const sc = statusConfig[item.status] || statusConfig.draft
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-base">{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[var(--muted-foreground)] truncate">{item.type.replace(/_/g, ' ')}</div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${sc.color} bg-[var(--muted)]`}>{sc.label}</span>
                  <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && data?.totals.generated === 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="font-medium mb-1">No content generated in the last {period} days</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Start creating content with your AI team — analytics will populate automatically.
          </p>
        </div>
      )}
    </div>
  )
}
