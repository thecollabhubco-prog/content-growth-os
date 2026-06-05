'use client'

import { useState } from 'react'

type Platform = 'blog' | 'linkedin' | 'x' | 'instagram' | 'youtube' | 'newsletter'

const platforms: { value: Platform; label: string; icon: string; types: string[] }[] = [
  { value: 'blog', label: 'Blog Article', icon: '📝', types: ['Long-form SEO article'] },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼', types: ['Post', 'Carousel'] },
  { value: 'x', label: 'X / Twitter', icon: '𝕏', types: ['Tweet', 'Thread'] },
  { value: 'instagram', label: 'Instagram', icon: '📸', types: ['Caption', 'Carousel'] },
  { value: 'youtube', label: 'YouTube', icon: '▶️', types: ['Script', 'Short Script', 'Description'] },
  { value: 'newsletter', label: 'Newsletter', icon: '📨', types: ['Weekly', 'Educational', 'Digest'] },
]

export default function CreatePage() {
  const [step, setStep] = useState<'platform' | 'form'>('platform')
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [format, setFormat] = useState('')
  const [topic, setTopic] = useState('')
  const [keywords, setKeywords] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ [key: string]: string | string[] | number | object | null | undefined } | null>(null)
  const [error, setError] = useState('')

  const selectedPlatform = platforms.find(p => p.value === platform)

  async function generate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError('')
    setResult(null)

    try {
      const endpoint = `/api/v1/generate/${platform}`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b',
        },
        body: JSON.stringify({
          input: {
            topic,
            keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
            additional_instructions: additionalInstructions,
          },
          format: format.toLowerCase().replace(' ', '_') || undefined,
          use_knowledge_brain: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.error?.message || 'Generation failed')
      }
    } catch {
      setError('Generation failed. Check your API keys in settings.')
    } finally {
      setGenerating(false)
    }
  }

  function reset() {
    setStep('platform')
    setPlatform(null)
    setFormat('')
    setTopic('')
    setResult(null)
    setError('')
  }

  if (result) {
    const mainContent = String(result.article || result.post || result.hook_tweet ||
      result.caption || result.body || result.script || JSON.stringify(result, null, 2))

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Content Generated</h1>
            <p className="text-[var(--muted-foreground)] text-sm mt-1">
              {result.tokens_used ? `${result.tokens_used} tokens · ` : ''}{String(result.model_used ?? '')}
            </p>
          </div>
          <button
            onClick={reset}
            className="text-sm border border-[var(--border)] px-4 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            Create another
          </button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          {result.seo_title ? (
            <div>
              <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">SEO TITLE</div>
              <div className="font-semibold">{String(result.seo_title)}</div>
            </div>
          ) : null}
          {result.meta_description ? (
            <div>
              <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">META DESCRIPTION</div>
              <div className="text-sm text-[var(--muted-foreground)]">{String(result.meta_description)}</div>
            </div>
          ) : null}
          <div>
            <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">CONTENT</div>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{String(mainContent)}</pre>
          </div>
          {Array.isArray(result.hashtags) ? (
            <div>
              <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">HASHTAGS</div>
              <div className="flex flex-wrap gap-1">
                {result.hashtags.map((tag: string) => (
                  <span key={tag} className="text-xs bg-[var(--muted)] px-2 py-0.5 rounded-full text-[var(--muted-foreground)]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(mainContent)}
            className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Copy content
          </button>
          <button
            onClick={reset}
            className="border border-[var(--border)] px-6 py-2.5 rounded-lg text-sm hover:bg-[var(--muted)] transition-colors"
          >
            New
          </button>
        </div>
      </div>
    )
  }

  if (step === 'platform') {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Content</h1>
          <p className="text-[var(--muted-foreground)] text-sm mt-1">Choose a platform to start</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {platforms.map(p => (
            <button
              key={p.value}
              onClick={() => {
                setPlatform(p.value)
                setFormat(p.types[0])
                setStep('form')
              }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 text-left hover:border-[var(--primary)] transition-colors"
            >
              <div className="text-2xl mb-2">{p.icon}</div>
              <div className="font-medium text-sm">{p.label}</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{p.types.join(' · ')}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setStep('platform')}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span>{selectedPlatform?.icon}</span>
          <span className="font-semibold">{selectedPlatform?.label}</span>
        </div>
      </div>

      <form onSubmit={generate} className="space-y-4">
        {selectedPlatform && selectedPlatform.types.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Format</label>
            <div className="flex gap-2 flex-wrap">
              {selectedPlatform.types.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormat(type)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    format === type
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">Topic</label>
          <input
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            required
            placeholder="What is this content about?"
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
          />
        </div>

        {platform === 'blog' && (
          <div>
            <label className="block text-sm font-medium mb-1.5">Target Keywords</label>
            <input
              type="text"
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Additional Instructions <span className="text-[var(--muted-foreground)] font-normal">(optional)</span>
          </label>
          <textarea
            value={additionalInstructions}
            onChange={e => setAdditionalInstructions(e.target.value)}
            placeholder="Any specific angle, tone, examples, or requirements..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        <button
          type="submit"
          disabled={generating || !topic.trim()}
          className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </span>
          ) : (
            `Generate ${selectedPlatform?.label} content`
          )}
        </button>
      </form>
    </div>
  )
}
