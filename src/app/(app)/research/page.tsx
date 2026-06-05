'use client'

import { useState } from 'react'

type InputType = 'topic' | 'keyword' | 'url' | 'text'

const inputTypes: { value: InputType; label: string; placeholder: string }[] = [
  { value: 'topic', label: 'Topic', placeholder: 'e.g. How to scale a consulting firm from 6 to 7 figures' },
  { value: 'keyword', label: 'Keyword', placeholder: 'e.g. consulting firm growth strategies' },
  { value: 'url', label: 'Website URL', placeholder: 'https://competitor.com/blog/article' },
  { value: 'text', label: 'Text / Notes', placeholder: 'Paste article, transcript, or notes...' },
]

export default function ResearchPage() {
  const [inputType, setInputType] = useState<InputType>('topic')
  const [inputData, setInputData] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<{ session_id: string; status: string } | null>(null)
  const [error, setError] = useState('')

  const selectedType = inputTypes.find(t => t.value === inputType)!

  async function runResearch(e: React.FormEvent) {
    e.preventDefault()
    if (!inputData.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/v1/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b', // Will be replaced with real workspace ID
        },
        body: JSON.stringify({
          title: title || inputData.slice(0, 80),
          input_type: inputType,
          input_data: inputData,
          options: {
            competitor_analysis: true,
            seo_opportunities: true,
            faq_opportunities: true,
            content_gaps: true,
            recommended_formats: true,
          },
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSession(data.data)
      } else {
        setError(data.error?.message || 'Research failed')
      }
    } catch (err) {
      setError('Failed to start research. Check your API keys.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Research Engine</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Deep content research, SEO analysis, and competitor intelligence
        </p>
      </div>

      {/* Input Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {inputTypes.map(type => (
          <button
            key={type.value}
            onClick={() => setInputType(type.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              inputType === type.value
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Research Form */}
      <form onSubmit={runResearch} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Research Name (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Give this research a name..."
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">{selectedType.label}</label>
          {inputType === 'text' ? (
            <textarea
              value={inputData}
              onChange={e => setInputData(e.target.value)}
              placeholder={selectedType.placeholder}
              rows={8}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition resize-none font-mono"
            />
          ) : (
            <input
              type={inputType === 'url' ? 'url' : 'text'}
              value={inputData}
              onChange={e => setInputData(e.target.value)}
              placeholder={selectedType.placeholder}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
            />
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !inputData.trim()}
          className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running research...
            </span>
          ) : (
            'Start Research'
          )}
        </button>
      </form>

      {/* Session Started */}
      {session && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-green-400">Research running</span>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Session ID: {session.session_id}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            Your research brief will be ready in 30-60 seconds. Results will appear in your Research history.
          </p>
        </div>
      )}

      {/* What this produces */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-3">What you get</h3>
        <ul className="space-y-1.5">
          {[
            'Content brief with recommended structure',
            'Keyword opportunities with intent analysis',
            'Topic cluster map',
            'Competitor content gap analysis',
            'FAQ opportunities',
            'SEO, GEO, and AEO recommendations',
            'Content format recommendations',
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-[var(--muted-foreground)]">
              <span className="text-green-400 shrink-0 mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
