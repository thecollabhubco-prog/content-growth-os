'use client'

import { useState } from 'react'

type KnowledgeType = {
  value: string
  label: string
  icon: string
  desc: string
  placeholder: string
}

const knowledgeTypes: KnowledgeType[] = [
  { value: 'brand_voice', label: 'Brand Voice', icon: '🎙️', desc: 'How your brand sounds and speaks', placeholder: 'Describe your brand voice. What words do you use? What do you avoid? What tone do you take?' },
  { value: 'business_info', label: 'Business Info', icon: '🏢', desc: 'What you do, who you serve', placeholder: 'Describe your business, what problems you solve, and who your ideal clients are.' },
  { value: 'service', label: 'Service / Offer', icon: '📦', desc: 'Your services or products', placeholder: 'Describe this service, who it\'s for, what it does, and what results it produces.' },
  { value: 'audience_persona', label: 'Audience Persona', icon: '👤', desc: 'Who your ideal customer is', placeholder: 'Describe this audience persona in detail. Their role, goals, pain points, objections, and how they make decisions.' },
  { value: 'case_study', label: 'Case Study', icon: '📈', desc: 'Client success stories', placeholder: 'Describe the client, their situation, what you did, and the results achieved.' },
  { value: 'writing_sample', label: 'Writing Sample', icon: '📄', desc: 'Examples of your best writing', placeholder: 'Paste a piece of writing that represents your voice at its best.' },
  { value: 'custom', label: 'Custom', icon: '✨', desc: 'Any other context', placeholder: 'Add any information you want the AI to know when creating content.' },
]

export default function BrainPage() {
  const [selectedType, setSelectedType] = useState<KnowledgeType | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedType || !title || !content) return

    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/v1/brain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b',
        },
        body: JSON.stringify({
          type: selectedType.value,
          title,
          content,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        setTitle('')
        setContent('')
        setSelectedType(null)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(data.error?.message || 'Save failed')
      }
    } catch {
      setError('Failed to save. Check your connection.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Brain</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Everything you add here gets injected into every AI generation. The more context you give, the better your content.
        </p>
      </div>

      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          Saved to Knowledge Brain. Embeddings are being generated.
        </div>
      )}

      {/* Type Selector */}
      {!selectedType ? (
        <div>
          <h2 className="text-sm font-semibold text-[var(--muted-foreground)] mb-3">What do you want to add?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {knowledgeTypes.map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type)}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 text-left hover:border-[var(--primary)] transition-colors"
              >
                <div className="text-xl mb-2">{type.icon}</div>
                <div className="font-medium text-sm">{type.label}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              ← Back
            </button>
            <div className="flex items-center gap-2">
              <span>{selectedType.icon}</span>
              <span className="font-medium text-sm">{selectedType.label}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder={`Name this ${selectedType.label.toLowerCase()}...`}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Content</label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              placeholder={selectedType.placeholder}
              rows={10}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition resize-none"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              {content.length} chars — more detail = better AI outputs
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={saving || !title || !content}
            className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving...' : 'Save to Knowledge Brain'}
          </button>
        </form>
      )}

      {/* Info */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <h3 className="font-semibold text-sm mb-2">How the Knowledge Brain works</h3>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          Every piece of content you add is converted into a vector embedding and stored in your workspace.
          When you generate content, the system semantically retrieves the most relevant context and injects it
          into the AI prompt. This is how your brand voice, offers, and audience knowledge stay consistent
          across everything the AI creates.
        </p>
      </div>
    </div>
  )
}
