'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/lib/workspace/context'
import { cn, relativeTime } from '@/lib/utils'

type ContentItem = {
  id: string
  workspace_id: string
  title: string | null
  content: string | null
  content_html: string | null
  type: string
  platform: string | null
  status: string
  word_count: number | null
  created_at: string
  published_at: string | null
  metadata: Record<string, unknown> | null
}

const PLATFORM_META: Record<string, { icon: string; label: string; publishAs: string | null }> = {
  blog:       { icon: '📝', label: 'Blog',       publishAs: 'wordpress' },
  linkedin:   { icon: '💼', label: 'LinkedIn',   publishAs: 'linkedin' },
  x:          { icon: '𝕏',  label: 'X',          publishAs: 'x' },
  instagram:  { icon: '📸', label: 'Instagram',  publishAs: 'instagram' },
  youtube:    { icon: '▶️', label: 'YouTube',    publishAs: null },
  email:      { icon: '📨', label: 'Newsletter', publishAs: null },
  internal:   { icon: '📄', label: 'Internal',   publishAs: null },
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft:     { label: 'Draft',     cls: 'bg-amber-500/15 text-amber-500' },
  review:    { label: 'In review', cls: 'bg-blue-500/15 text-blue-400' },
  approved:  { label: 'Approved',  cls: 'bg-sky-500/15 text-sky-400' },
  scheduled: { label: 'Scheduled', cls: 'bg-purple-500/15 text-purple-400' },
  published: { label: 'Published', cls: 'bg-green-500/15 text-green-400' },
  archived:  { label: 'Archived',  cls: 'bg-zinc-500/15 text-zinc-400' },
  failed:    { label: 'Failed',    cls: 'bg-red-500/15 text-red-400' },
}

const STATUS_FILTERS = [
  { value: '',          label: 'All' },
  { value: 'draft',     label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'scheduled', label: 'Scheduled' },
]

function platformMeta(p: string | null) {
  return PLATFORM_META[p || 'internal'] || PLATFORM_META.internal
}

export default function LibraryPage() {
  const { workspaceId, workspace } = useWorkspace()
  const [items, setItems] = useState<ContentItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState('')
  const [selected, setSelected] = useState<ContentItem | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter) params.set('status', statusFilter)
      if (platformFilter) params.set('platform', platformFilter)

      // Personal Brand is a virtual aggregator with no DB row of its own —
      // pull content from each source workspace and merge.
      const wsIds = workspace.isPersonalBrand && workspace.sourceWorkspaceIds?.length
        ? workspace.sourceWorkspaceIds
        : [workspaceId]

      const results = await Promise.allSettled(wsIds.map(async id => {
        const res = await fetch(`/api/v1/content?${params}`, { headers: { 'x-workspace-id': id } })
        const data = await res.json()
        return data.success ? { items: data.data as ContentItem[], total: data.meta?.total ?? 0 } : { items: [], total: 0 }
      }))

      const merged: ContentItem[] = []
      let count = 0
      for (const r of results) if (r.status === 'fulfilled') { merged.push(...r.value.items); count += r.value.total }
      merged.sort((a, b) => b.created_at.localeCompare(a.created_at))
      setItems(merged)
      setTotal(count)
    } catch { /* keep previous items */ } finally { setLoading(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workspace.isPersonalBrand, statusFilter, platformFilter])

  useEffect(() => { load() }, [load])

  function flash(kind: 'ok' | 'err', text: string) {
    setNotice({ kind, text })
    setTimeout(() => setNotice(null), 4000)
  }

  async function publishItem(item: ContentItem) {
    const publishAs = platformMeta(item.platform).publishAs
    if (!publishAs || busy) return
    if (!confirm(`Publish "${item.title || 'Untitled'}" live to ${publishAs}?`)) return
    setBusy(item.id)
    try {
      const res = await fetch('/api/v1/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': item.workspace_id || workspaceId },
        body: JSON.stringify({ content_item_id: item.id, platform: publishAs }),
      })
      const data = await res.json()
      if (data.success) {
        flash('ok', `Published${data.data.platform_post_url ? ` — ${data.data.platform_post_url}` : ''}`)
        setSelected(null)
        load()
      } else {
        flash('err', data.error?.message || 'Publish failed')
      }
    } catch (e) { flash('err', String(e)) } finally { setBusy(null) }
  }

  async function deleteItem(item: ContentItem) {
    if (busy) return
    if (!confirm(`Delete "${item.title || 'Untitled'}"? This can't be undone.`)) return
    setBusy(item.id)
    try {
      const res = await fetch(`/api/v1/content?id=${item.id}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': item.workspace_id || workspaceId },
      })
      const data = await res.json()
      if (data.success) {
        flash('ok', 'Deleted')
        setSelected(null)
        setItems(prev => prev.filter(i => i.id !== item.id))
      } else {
        flash('err', data.error?.message || 'Delete failed')
      }
    } catch (e) { flash('err', String(e)) } finally { setBusy(null) }
  }

  function copyItem(item: ContentItem) {
    navigator.clipboard?.writeText(item.content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const platformsPresent = Array.from(new Set(items.map(i => i.platform || 'internal')))

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">📚 Content Library</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">
            Everything your team has produced for <span style={{ color: workspace.color }} className="font-medium">{workspace.name}</span> — review, publish, or clean up.
          </p>
        </div>
        <span className="text-xs text-[var(--muted-foreground)]">{total} item{total === 1 ? '' : 's'}</span>
      </div>

      {notice && (
        <div className={cn('text-sm px-4 py-3 rounded-lg border break-all',
          notice.kind === 'ok' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400')}>
          {notice.kind === 'ok' ? '✓ ' : '⚠️ '}{notice.text}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map(f => (
          <button key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={cn('text-xs px-3.5 py-1.5 rounded-full border transition',
              statusFilter === f.value
                ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]')}>
            {f.label}
          </button>
        ))}
        <span className="w-px h-5 bg-[var(--border)] mx-1" />
        <button onClick={() => setPlatformFilter('')}
          className={cn('text-xs px-3.5 py-1.5 rounded-full border transition',
            platformFilter === '' ? 'bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]')}>
          All platforms
        </button>
        {Object.entries(PLATFORM_META).filter(([k]) => k !== 'internal' && (platformFilter === k || platformsPresent.includes(k))).map(([k, v]) => (
          <button key={k} onClick={() => setPlatformFilter(platformFilter === k ? '' : k)}
            className={cn('text-xs px-3.5 py-1.5 rounded-full border transition',
              platformFilter === k ? 'bg-[var(--muted)] border-[var(--primary)] text-[var(--foreground)]' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]')}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-16">Loading your content…</div>
      ) : items.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🗂️</div>
          <h2 className="font-semibold mb-1">Nothing here yet</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Ask any team member to draft something — it will land here automatically.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map(item => {
            const pm = platformMeta(item.platform)
            const sm = STATUS_META[item.status] || STATUS_META.draft
            return (
              <button key={item.id} onClick={() => setSelected(item)}
                className="text-left bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--primary)]/40 hover:shadow-lg transition group">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-lg">{pm.icon}</span>
                  <span className="text-xs font-medium text-[var(--muted-foreground)]">{pm.label}</span>
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto', sm.cls)}>{sm.label}</span>
                </div>
                <h3 className="font-semibold text-sm leading-snug mb-1.5 group-hover:text-[var(--primary)] transition line-clamp-2">
                  {item.title || 'Untitled'}
                </h3>
                <p className="text-xs text-[var(--muted-foreground)] line-clamp-2 mb-3">
                  {(item.content || '').replace(/^#+\s.*\n/, '').slice(0, 160)}
                </p>
                <div className="flex items-center gap-3 text-[10px] text-[var(--muted-foreground)]">
                  <span>{relativeTime(new Date(item.created_at))}</span>
                  {item.word_count ? <span>· {item.word_count} words</span> : null}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 p-5 border-b border-[var(--border)]">
              <span className="text-2xl">{platformMeta(selected.platform).icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-base leading-snug">{selected.title || 'Untitled'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', (STATUS_META[selected.status] || STATUS_META.draft).cls)}>
                    {(STATUS_META[selected.status] || STATUS_META.draft).label}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{relativeTime(new Date(selected.created_at))}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm hover:opacity-80 transition shrink-0">✕</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap flex-1">
              {selected.content || 'No content'}
            </div>
            <div className="flex flex-wrap items-center gap-2 p-4 border-t border-[var(--border)]">
              {selected.status !== 'published' && platformMeta(selected.platform).publishAs && (
                <button onClick={() => publishItem(selected)} disabled={busy === selected.id}
                  className="text-xs font-semibold bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition">
                  {busy === selected.id ? 'Publishing…' : `🚀 Publish to ${platformMeta(selected.platform).publishAs}`}
                </button>
              )}
              <button onClick={() => copyItem(selected)}
                className="text-xs border border-[var(--border)] px-4 py-2 rounded-lg hover:bg-[var(--muted)] transition text-[var(--muted-foreground)]">
                {copied ? '✓ Copied' : 'Copy content'}
              </button>
              {selected.status !== 'published' && (
                <button onClick={() => deleteItem(selected)} disabled={busy === selected.id}
                  className="text-xs border border-red-500/30 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition ml-auto">
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
