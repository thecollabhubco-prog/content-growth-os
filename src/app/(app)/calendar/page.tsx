'use client'

import { useState, useEffect } from 'react'

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

const platformIcons: Record<string, string> = {
  blog: '📝', linkedin: '💼', x: '𝕏', instagram: '📸', youtube: '▶️', email: '📨'
}

const statusColors: Record<string, string> = {
  planned: 'text-zinc-400 bg-zinc-500/10',
  ready: 'text-blue-400 bg-blue-500/10',
  approved: 'text-green-400 bg-green-500/10',
  scheduled: 'text-purple-400 bg-purple-500/10',
  published: 'text-emerald-400 bg-emerald-500/10',
  failed: 'text-red-400 bg-red-500/10',
  cancelled: 'text-zinc-500 bg-zinc-500/10',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [newEntry, setNewEntry] = useState({ title: '', platform: '', scheduled_time: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadEntries() }, [year, month])

  async function loadEntries() {
    setLoading(true)
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = getDaysInMonth(year, month)
    const end = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`

    try {
      const res = await fetch(`/api/v1/calendar?start=${start}&end=${end}`, {
        headers: { 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
      })
      const data = await res.json()
      if (data.success) setEntries(data.data || [])
    } finally { setLoading(false) }
  }

  async function addEntry() {
    if (!newEntry.title || !selectedDate) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
        body: JSON.stringify({
          title: newEntry.title,
          platform: newEntry.platform || null,
          scheduled_date: selectedDate,
          scheduled_time: newEntry.scheduled_time || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowAddForm(false)
        setNewEntry({ title: '', platform: '', scheduled_time: '' })
        loadEntries()
      }
    } finally { setSaving(false) }
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  function getEntriesForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return entries.filter(e => e.scheduled_date === dateStr)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-0.5">Plan and schedule across all platforms</p>
        </div>
        <button
          onClick={() => { setShowAddForm(true); setSelectedDate(null) }}
          className="bg-[var(--primary)] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 transition"
        >
          + Add entry
        </button>
      </div>

      {/* Month Navigator */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-[var(--muted)] transition text-sm">←</button>
          <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-[var(--muted)] transition text-sm">→</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[var(--border)]">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">{d}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-r border-b border-[var(--border)] bg-[var(--muted)]/30" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayEntries = getEntriesForDay(day)
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day

            return (
              <div
                key={day}
                className={`min-h-[80px] border-r border-b border-[var(--border)] p-1.5 cursor-pointer hover:bg-[var(--muted)]/50 transition ${isToday ? 'bg-[var(--primary)]/5' : ''}`}
                onClick={() => { setSelectedDate(dateStr); setShowAddForm(true) }}
              >
                <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)]'}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map(entry => (
                    <div
                      key={entry.id}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)]/20 text-[var(--primary)] truncate"
                      title={entry.title}
                    >
                      {platformIcons[entry.platform || ''] || '•'} {entry.title}
                    </div>
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[10px] text-[var(--muted-foreground)] px-1">+{dayEntries.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Add Calendar Entry</h2>
              <button onClick={() => setShowAddForm(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Title</label>
                <input
                  type="text"
                  value={newEntry.title}
                  onChange={e => setNewEntry(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Content title or description"
                  className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Scheduled Date</label>
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
                    value={newEntry.platform}
                    onChange={e => setNewEntry(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  >
                    <option value="">All platforms</option>
                    {['blog', 'linkedin', 'x', 'instagram', 'youtube', 'email'].map(p => (
                      <option key={p} value={p}>{platformIcons[p]} {p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">Time (optional)</label>
                  <input
                    type="time"
                    value={newEntry.scheduled_time}
                    onChange={e => setNewEntry(prev => ({ ...prev, scheduled_time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={addEntry}
                  disabled={saving || !newEntry.title || !selectedDate}
                  className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? 'Saving...' : 'Add to calendar'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
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
