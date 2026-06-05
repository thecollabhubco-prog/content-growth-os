'use client'

import { useState, useEffect } from 'react'
import { relativeTime } from '@/lib/utils'

type TrendSignal = {
  id: string
  topic: string
  signal_strength: number | null
  trend_direction: 'rising' | 'stable' | 'declining' | null
  content_opportunity: string | null
  source: string | null
  detected_at: string
}

const directionConfig = {
  rising: { label: 'Rising', color: 'text-green-400', bg: 'bg-green-500/10', icon: '↑' },
  stable: { label: 'Stable', color: 'text-yellow-400', bg: 'bg-yellow-500/10', icon: '→' },
  declining: { label: 'Declining', color: 'text-red-400', bg: 'bg-red-500/10', icon: '↓' },
}

export default function TrendsPage() {
  const [signals, setSignals] = useState<TrendSignal[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [industry, setIndustry] = useState('business consulting')
  const [message, setMessage] = useState('')

  useEffect(() => { loadSignals() }, [])

  async function loadSignals() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/trends', { headers: { 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' } })
      const data = await res.json()
      if (data.success) setSignals(data.data || [])
    } finally { setLoading(false) }
  }

  async function runScan() {
    setScanning(true)
    setMessage('')
    try {
      const res = await fetch('/api/v1/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
        body: JSON.stringify({ industry }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage(`Found ${data.data?.signals_found || 0} new trend signals`)
        loadSignals()
      } else {
        setMessage(data.error?.message || 'Scan failed')
      }
    } finally { setScanning(false) }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trend Prediction</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Live industry signals and emerging content opportunities</p>
        </div>
      </div>

      {/* Scan Controls */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h2 className="font-semibold text-sm mb-3">Run Trend Scan</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            placeholder="Industry or niche (e.g. SaaS, consulting, finance)"
            className="flex-1 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
          />
          <button
            onClick={runScan}
            disabled={scanning}
            className="bg-[var(--primary)] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
          >
            {scanning ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scanning...
              </span>
            ) : 'Scan now'}
          </button>
        </div>
        {message && (
          <p className="text-xs mt-2 text-green-400">{message}</p>
        )}
        <p className="text-xs text-[var(--muted-foreground)] mt-2">
          Searches Tavily for trending topics, analyzes them with AI, and stores opportunities in your workspace.
          Set up a daily n8n workflow to run this automatically.
        </p>
      </div>

      {/* Trend Signals */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
          Detected Signals ({signals.length})
        </h2>

        {loading ? (
          <div className="text-center text-sm text-[var(--muted-foreground)] py-8">Loading signals...</div>
        ) : signals.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">📡</div>
            <p className="text-sm font-medium mb-1">No trend signals yet</p>
            <p className="text-xs text-[var(--muted-foreground)]">Run a scan to detect emerging trends in your industry.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {signals.map(signal => {
              const dir = signal.trend_direction && directionConfig[signal.trend_direction]
              const strength = signal.signal_strength || 0

              return (
                <div key={signal.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm">{signal.topic}</h3>
                        {dir && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${dir.bg} ${dir.color}`}>
                            {dir.icon} {dir.label}
                          </span>
                        )}
                      </div>
                      {signal.content_opportunity && (
                        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{signal.content_opportunity}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-[var(--muted-foreground)] mb-1">{relativeTime(signal.detected_at)}</div>
                      {signal.signal_strength !== null && (
                        <div className="flex items-center gap-1.5 justify-end">
                          <div className="w-16 h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--primary)] rounded-full"
                              style={{ width: `${strength * 100}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--muted-foreground)]">{(strength * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
