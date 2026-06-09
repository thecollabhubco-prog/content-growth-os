'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

type CalendarEntry = {
  id: string
  title: string
  platform: string | null
  content_type: string | null
  scheduled_date: string
  scheduled_time: string | null
  status: string
  notes: string | null
  color: string | null
}

type FormState = {
  title: string
  platform: string
  scheduled_time: string
  status: string
  notes: string
}

const BLANK_FORM: FormState = { title: '', platform: '', scheduled_time: '', status: 'planned', notes: '' }

const platformIcons: Record<string, string> = {
  blog: '📝', linkedin: '💼', x: '𝕏', instagram: '📸', youtube: '▶️', email: '📨'
}

const statusConfig: Record<string, { label: string; pill: string }> = {
  planned:   { label: 'Planned',   pill: 'bg-zinc-500/15 text-zinc-400' },
  ready:     { label: 'Ready',     pill: 'bg-blue-500/15 text-blue-400' },
  approved:  { label: 'Approved',  pill: 'bg-green-500/15 text-green-400' },
  scheduled: { label: 'Scheduled', pill: 'bg-purple-500/15 text-purple-400' },
  published: { label: 'Published', pill: 'bg-emerald-500/15 text-emerald-400' },
  failed:    { label: 'Failed',    pill: 'bg-red-500/15 text-red-400' },
  cancelled: { label: 'Cancelled', pill: 'bg-zinc-500/15 text-zinc-500' },
}

const platformBarColors: Record<string, string> = {
  blog: 'bg-blue-500', linkedin: 'bg-sky-500', x: 'bg-zinc-400',
  instagram: 'bg-pink-500', youtube: 'bg-red-500', email: 'bg-green-500',
}

const DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay() }

export default function CalendarPage() {
  const now   = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editEntry, setEditEntry] = useState<CalendarEntry | null>(null)  // null = create
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [saving, setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null) // detail panel

  useEffect(() => { loadEntries() }, [year, month])

  async function loadEntries() {
    setLoading(true)
    const pad = (n: number) => String(n).padStart(2, '0')
    const start = `${year}-${pad(month + 1)}-01`
    const end   = `${year}-${pad(month + 1)}-${getDaysInMonth(year, month)}`
    try {
      const res  = await fetch(`/api/v1/calendar?start=${start}&end=${end}`, {
        headers: { 'x-workspace-id': WORKSPACE_ID },
      })
      const data = await res.json()
      if (data.success) setEntries(data.data || [])
    } finally { setLoading(false) }
  }

  function openCreate(date: string) {
    setEditEntry(null)
    setSelectedDate(date)
    setForm({ ...BLANK_FORM })
    setShowForm(true)
    setSelectedEntry(null)
  }

  function openEdit(entry: CalendarEntry) {
    setEditEntry(entry)
    setSelectedDate(entry.scheduled_date)
    setForm({
      title: entry.title,
      platform: entry.platform || '',
      scheduled_time: entry.scheduled_time || '',
      status: entry.status,
      notes: entry.notes || '',
    })
    setShowForm(true)
    setSelectedEntry(null)
  }

  async function saveEntry() {
    if (!form.title.trim() || !selectedDate) return
    setSaving(true)
    try {
      if (editEntry) {
        // PATCH
        await fetch('/api/v1/calendar', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-workspace-id': WORKSPACE_ID },
          body: JSON.stringify({
            id: editEntry.id,
            title: form.title,
            platform: form.platform || null,
            scheduled_date: selectedDate,
            scheduled_time: form.scheduled_time || null,
            status: form.status,
            notes: form.notes || null,
          }),
        })
      } else {
        // POST
        await fetch('/api/v1/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-workspace-id': WORKSPACE_ID },
          body: JSON.stringify({
            title: form.title,
            platform: form.platform || null,
            scheduled_date: selectedDate,
            scheduled_time: form.scheduled_time || null,
            status: form.status,
            notes: form.notes || null,
          }),
        })
      }
      setShowForm(false)
      setEditEntry(null)
      loadEntries()
    } finally { setSaving(false) }
  }

  async function deleteEntry(id: string) {
    if (!confirm('Delete this calendar entry?')) return
    setDeleting(id)
    try {
      await fetch(`/api/v1/calendar?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': WORKSPACE_ID },
      })
      setEntries(prev => prev.filter(e => e.id !== id))
      if (selectedEntry?.id === id) setSelectedEntry(null)
    } finally { setDeleting(null) }
  }

  async function quickStatus(entry: CalendarEntry, status: string) {
    await fetch('/api/v1/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-workspace-id': WORKSPACE_ID },
      body: JSON.stringify({ id: entry.id, status }),
    })
    setEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status } : e))
    if (selectedEntry?.id === entry.id) setSelectedEntry(e => e ? { ...e, status } : e)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay    = getFirstDay(year, month)

  function pad(n: number) { return String(n).padStart(2, '0') }

  function getDay(day: number) {
    const s = `${year}-${pad(month + 1)}-${pad(day)}`
    return entries.filter(e => e.scheduled_date === s)
  }

  function prevMonth() { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setYear(y => y + 1); setMonth(0)  } else setMonth(m => m + 1) }

  // Stats
  const totalThisMonth = entries.length
  const publishedCount = entries.filter(e => e.status === 'published').length
  const plannedCount   = entries.filter(e => e.status === 'planned' || e.status === 'ready').length

  return (
    <div className="max-w-6xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Plan and schedule across all platforms</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 text-xs text-[var(--muted-foreground)] border border-[var(--border)] rounded-lg px-3 py-2">
            <span>📅 {totalThisMonth} entries</span>
            <span>🚀 {publishedCount} published</span>
            <span>📋 {plannedCount} planned</span>
          </div>
          <button
            onClick={() => openCreate(new Date().toISOString().slice(0, 10))}
            className="bg-[var(--primary)] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition"
          >
            + Add entry
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-[var(--muted)] transition">←</button>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
              <button
                onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Today
              </button>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-[var(--muted)] transition">→</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)]">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} className="min-h-[88px] border-r border-b border-[var(--border)] bg-[var(--muted)]/20" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day     = i + 1
              const dayEntries = getDay(day)
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
              const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day
              const isPast  = new Date(dateStr) < new Date(now.toISOString().slice(0, 10))

              return (
                <div
                  key={day}
                  className={cn(
                    'min-h-[88px] border-r border-b border-[var(--border)] p-1.5 transition',
                    isToday ? 'bg-[var(--primary)]/5' : isPast ? 'bg-[var(--muted)]/10' : '',
                    'hover:bg-[var(--muted)]/40 cursor-pointer'
                  )}
                  onClick={() => openCreate(dateStr)}
                >
                  <div className={cn(
                    'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full',
                    isToday ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]'
                  )}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEntries.slice(0, 3).map(entry => {
                      const barColor = platformBarColors[entry.platform || ''] || 'bg-[var(--primary)]'
                      const sc = statusConfig[entry.status] || statusConfig.planned
                      return (
                        <div
                          key={entry.id}
                          className={cn('text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 truncate cursor-pointer', sc.pill)}
                          title={`${entry.title} — ${sc.label}`}
                          onClick={e => { e.stopPropagation(); setSelectedEntry(entry); setShowForm(false) }}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', barColor)} />
                          <span className="truncate">{platformIcons[entry.platform || ''] || '•'} {entry.title}</span>
                        </div>
                      )
                    })}
                    {dayEntries.length > 3 && (
                      <div className="text-[10px] text-[var(--muted-foreground)] px-1">+{dayEntries.length - 3} more</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Detail / legend panel */}
        <div className="w-64 shrink-0 hidden lg:block space-y-3">

          {/* Entry detail */}
          {selectedEntry ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{platformIcons[selectedEntry.platform || ''] || '📋'}</span>
                  <div>
                    <p className="font-medium text-sm leading-tight">{selectedEntry.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{selectedEntry.scheduled_date}{selectedEntry.scheduled_time ? ` · ${selectedEntry.scheduled_time}` : ''}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs">✕</button>
              </div>

              {/* Status pills */}
              <div>
                <p className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1.5 uppercase tracking-wide">Status</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(statusConfig).map(([s, cfg]) => (
                    <button
                      key={s}
                      onClick={() => quickStatus(selectedEntry, s)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full transition',
                        selectedEntry.status === s ? cfg.pill + ' ring-1 ring-current' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                      )}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedEntry.notes && (
                <div>
                  <p className="text-[10px] font-medium text-[var(--muted-foreground)] mb-1 uppercase tracking-wide">Notes</p>
                  <p className="text-xs text-[var(--foreground)] leading-relaxed">{selectedEntry.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => openEdit(selectedEntry)}
                  className="flex-1 text-xs py-2 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => deleteEntry(selectedEntry.id)}
                  disabled={deleting === selectedEntry.id}
                  className="flex-1 text-xs py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  {deleting === selectedEntry.id ? '…' : '🗑️ Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
              <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Legend</p>
              <div className="space-y-2">
                {Object.entries(statusConfig).map(([, cfg]) => (
                  <div key={cfg.label} className="flex items-center gap-2">
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', cfg.pill)}>{cfg.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)] mt-4">Click any entry on the calendar to manage it.</p>
            </div>
          )}

          {/* Upcoming entries */}
          {(() => {
            const todayStr = now.toISOString().slice(0, 10)
            const upcoming = entries
              .filter(e => e.scheduled_date >= todayStr && e.status !== 'published' && e.status !== 'cancelled')
              .slice(0, 5)
            if (upcoming.length === 0) return null
            return (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">Upcoming</p>
                <div className="space-y-2">
                  {upcoming.map(e => {
                    const sc = statusConfig[e.status] || statusConfig.planned
                    return (
                      <div
                        key={e.id}
                        className="flex items-start gap-2 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setSelectedEntry(e)}
                      >
                        <span className="text-base shrink-0 mt-0.5">{platformIcons[e.platform || ''] || '📋'}</span>
                        <div className="min-w-0">
                          <p className="text-xs truncate">{e.title}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">{e.scheduled_date}</p>
                        </div>
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5', sc.pill)}>{sc.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold">{editEntry ? 'Edit Entry' : 'Add Calendar Entry'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Title *</label>
                <input
                  autoFocus
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && saveEntry()}
                  placeholder="e.g. LinkedIn post about scaling tips"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Date *</label>
                <input
                  type="date"
                  value={selectedDate || ''}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Platform</label>
                  <select
                    value={form.platform}
                    onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  >
                    <option value="">All platforms</option>
                    {Object.entries(platformIcons).map(([p, icon]) => (
                      <option key={p} value={p}>{icon} {p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Time</label>
                  <input
                    type="time"
                    value={form.scheduled_time}
                    onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(statusConfig).map(([s, cfg]) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, status: s }))}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-full transition',
                        form.status === s ? cfg.pill + ' ring-1 ring-current' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]'
                      )}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any notes about this piece..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition resize-none"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveEntry}
                  disabled={saving || !form.title.trim() || !selectedDate}
                  className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving…' : editEntry ? 'Save changes' : 'Add to calendar'}
                </button>
                {editEntry && (
                  <button
                    onClick={() => { deleteEntry(editEntry.id); setShowForm(false) }}
                    className="px-4 py-2.5 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
