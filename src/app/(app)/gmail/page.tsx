'use client'

import { useState, useEffect } from 'react'
import { relativeTime } from '@/lib/utils'

type EmailThread = {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
  labels: string[]
  message_count: number
  is_unread: boolean
  is_starred: boolean
  has_attachment: boolean
}

type ComposeMode = null | 'new' | 'reply'

export default function GmailPage() {
  const [threads, setThreads] = useState<EmailThread[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<EmailThread | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [composeMode, setComposeMode] = useState<ComposeMode>(null)
  const [composeTo, setComposeTo] = useState('')
  const [composeSubject, setComposeSubject] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => { loadThreads() }, [])

  async function loadThreads(q?: string) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '25' })
      if (q) params.set('q', q)
      const res = await fetch(`/api/v1/gmail/threads?${params}`, {
        headers: { 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
      })
      const data = await res.json()
      if (data.success) {
        setThreads(data.data || [])
      } else {
        setError(data.error?.message || 'Failed to load Gmail. Connect your Google account first.')
      }
    } catch {
      setError('Failed to connect to Gmail. Make sure your Google account is connected.')
    } finally {
      setLoading(false)
    }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!searchQuery.trim()) { loadThreads(); return }
    setSearching(true)
    try {
      const res = await fetch('/api/v1/gmail/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
        body: JSON.stringify({ query: searchQuery, natural_language: true }),
      })
      const data = await res.json()
      if (data.success) setThreads(data.data?.results || [])
    } finally { setSearching(false) }
  }

  async function sendEmail() {
    if (!composeTo || !composeSubject || !composeBody) return
    setSending(true)
    try {
      const res = await fetch('/api/v1/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
        body: JSON.stringify({
          to: [composeTo],
          subject: composeSubject,
          html_body: composeBody.replace(/\n/g, '<br>'),
          thread_id: composeMode === 'reply' ? selected?.id : undefined,
          mode: 'send',
        }),
      })
      const data = await res.json()
      if (data.success) {
        setComposeMode(null)
        setComposeTo(''); setComposeSubject(''); setComposeBody('')
      }
    } finally { setSending(false) }
  }

  function fromName(from: string) {
    return from.replace(/<.*>/, '').trim() || from
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-0 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Thread List */}
      <div className="w-80 shrink-0 border-r border-[var(--border)] flex flex-col">
        {/* Toolbar */}
        <div className="p-3 border-b border-[var(--border)] space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Gmail</span>
            <button
              onClick={() => setComposeMode('new')}
              className="ml-auto bg-[var(--primary)] text-white text-xs px-3 py-1.5 rounded-md hover:opacity-90 transition"
            >
              + Compose
            </button>
          </div>
          <form onSubmit={search} className="flex gap-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search or ask in plain English..."
              className="flex-1 px-3 py-1.5 rounded-md border border-[var(--border)] bg-[var(--background)] text-xs focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition"
            />
            <button type="submit" disabled={searching}
              className="px-2 py-1.5 text-xs border border-[var(--border)] rounded-md hover:bg-[var(--muted)] transition">
              {searching ? '...' : '🔍'}
            </button>
          </form>
        </div>

        {/* Thread Items */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">Loading...</div>
          )}
          {error && (
            <div className="p-4">
              <div className="text-xs text-red-400 bg-red-500/10 rounded-lg p-3">{error}</div>
              <a href="/publishing" className="block text-xs text-[var(--primary)] mt-2 hover:underline">
                Connect Gmail →
              </a>
            </div>
          )}
          {!loading && !error && threads.length === 0 && (
            <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">No emails found</div>
          )}
          {threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => setSelected(thread)}
              className={`w-full text-left p-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${selected?.id === thread.id ? 'bg-[var(--muted)]' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={`text-xs truncate ${thread.is_unread ? 'font-semibold text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                  {fromName(thread.from)}
                </span>
                <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                  {relativeTime(new Date(parseInt(thread.date)))}
                </span>
              </div>
              <div className={`text-xs truncate mb-0.5 ${thread.is_unread ? 'font-medium' : 'text-[var(--muted-foreground)]'}`}>
                {thread.subject}
              </div>
              <div className="text-[11px] text-[var(--muted-foreground)] truncate">{thread.snippet}</div>
              <div className="flex items-center gap-1 mt-1">
                {thread.is_unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                {thread.has_attachment && <span className="text-[10px] text-[var(--muted-foreground)]">📎</span>}
                {thread.is_starred && <span className="text-[10px]">⭐</span>}
                {thread.message_count > 1 && (
                  <span className="text-[10px] text-[var(--muted-foreground)]">{thread.message_count}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Thread / Compose View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {composeMode ? (
          <div className="flex flex-col h-full p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm">{composeMode === 'reply' ? 'Reply' : 'New Email'}</h2>
              <button onClick={() => setComposeMode(null)} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">✕</button>
            </div>
            <div className="space-y-3 flex-1">
              <input
                type="email"
                placeholder="To"
                value={composeTo}
                onChange={e => setComposeTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
              />
              <input
                type="text"
                placeholder="Subject"
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
              />
              <textarea
                placeholder="Write your email..."
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition resize-none"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={sendEmail}
                disabled={sending || !composeTo || !composeSubject || !composeBody}
                className="bg-[var(--primary)] text-white px-6 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button
                onClick={() => setComposeMode(null)}
                className="border border-[var(--border)] px-4 py-2 rounded-lg text-sm hover:bg-[var(--muted)] transition"
              >
                Discard
              </button>
            </div>
          </div>
        ) : selected ? (
          <div className="flex flex-col h-full p-5 overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-base mb-1">{selected.subject}</h2>
                <div className="text-xs text-[var(--muted-foreground)]">
                  From: {selected.from} · {relativeTime(new Date(parseInt(selected.date)))}
                </div>
              </div>
              <button
                onClick={() => { setComposeMode('reply'); setComposeSubject(`Re: ${selected.subject}`) }}
                className="text-xs bg-[var(--primary)] text-white px-3 py-1.5 rounded-md hover:opacity-90 transition ml-3 shrink-0"
              >
                Reply
              </button>
            </div>

            <div className="bg-[var(--muted)] rounded-xl p-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {selected.snippet}
              <p className="text-xs mt-2 italic opacity-60">
                (Full email body loads when Gmail connection is active)
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-[var(--muted-foreground)]">
              <div className="text-4xl mb-3">📧</div>
              <p className="text-sm">Select an email to read</p>
              <p className="text-xs mt-1 opacity-60">or compose a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
