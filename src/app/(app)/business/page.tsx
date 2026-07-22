'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/lib/workspace/context'

interface Section {
  key: string
  label: string
  icon: string
  description: string
  placeholder: string
  knowledgeType: string
}

const SECTIONS: Section[] = [
  {
    key: 'mission',
    label: 'Mission & Vision',
    icon: '🎯',
    description: 'What does your business do, why does it exist, and what future are you building?',
    placeholder: 'We help B2B founders scale from 6 to 7 figures by building systems and teams that operate without them...',
    knowledgeType: 'business_info',
  },
  {
    key: 'audience',
    label: 'Target Audience',
    icon: '👤',
    description: 'Who is your ideal customer? Their pain, desire, situation, and transformation.',
    placeholder: 'Our ideal client is a founder doing £500k–£2M revenue, feeling stuck in the day-to-day, wanting to scale without burning out...',
    knowledgeType: 'audience_persona',
  },
  {
    key: 'brand_voice',
    label: 'Brand Voice & Tone',
    icon: '🗣️',
    description: 'How do you sound? Tone, personality, words you use, words you never use.',
    placeholder: 'Direct, confident, no fluff. We speak like a trusted advisor, not a corporate consultant. Never use jargon like "synergy" or "leverage". We say "grow" not "scale" when talking to early-stage...',
    knowledgeType: 'brand_voice',
  },
  {
    key: 'offers',
    label: 'Key Offers & Services',
    icon: '💼',
    description: 'What do you sell? Price points, outcomes, differentiators.',
    placeholder: '1. Scaling Intensive (£5k) — 2-day strategy session for founders stuck at £500k\n2. Growth OS (£2k/month) — done-with-you systems implementation\n3. Team Build Programme...',
    knowledgeType: 'offer',
  },
  {
    key: 'goals',
    label: '90-Day Goals',
    icon: '📈',
    description: 'What are you actively working towards right now? Revenue, audience, content, launches.',
    placeholder: 'Q3 goals: Hit £30k MRR, grow LinkedIn to 5k followers, launch the Growth OS waitlist, publish 3 case studies...',
    knowledgeType: 'business_info',
  },
  {
    key: 'content_strategy',
    label: 'Content Strategy',
    icon: '📝',
    description: 'What topics, angles, and formats work for your audience? What do you stand for?',
    placeholder: 'Pillars: (1) Systems thinking, (2) Founder mindset, (3) Behind-the-scenes of scaling. We avoid generic motivational content. Best-performing format: personal story + tactical lesson...',
    knowledgeType: 'writing_preference',
  },
  {
    key: 'competitors',
    label: 'Competitors & Positioning',
    icon: '🏆',
    description: 'Who else is in your space? How are you different? What do you never want to sound like?',
    placeholder: 'Main competitors: Alex Hormozi (volume-first), Dan Martell (SaaS-focused). We differ by focusing on service businesses and human-led systems rather than pure automation...',
    knowledgeType: 'business_info',
  },
  {
    key: 'proof',
    label: 'Social Proof & Results',
    icon: '⭐',
    description: 'Key results, client wins, testimonials, and metrics you can reference in content.',
    placeholder: '• Client A went from £400k to £1.2M in 14 months\n• 87% of clients hit targets within 90 days\n• "Best investment we made this year" — James R, founder...',
    knowledgeType: 'case_study',
  },
]

interface SavedData {
  [key: string]: { content: string; savedAt: string; id?: string }
}

export default function BusinessMemoryPage() {
  const { workspace, workspaceId } = useWorkspace()
  const [values, setValues] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<SavedData>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [activeSection, setActiveSection] = useState<string | null>(null)

  // Load existing knowledge items for this workspace
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/v1/business?workspace_id=${workspaceId}`)
      if (!res.ok) return
      const { data } = await res.json()
      if (!data?.items) return
      const loaded: Record<string, string> = {}
      const savedMap: SavedData = {}
      for (const item of data.items) {
        const section = SECTIONS.find(s => s.label === item.title && s.knowledgeType === item.type)
        if (section) {
          loaded[section.key] = item.content
          savedMap[section.key] = { content: item.content, savedAt: item.updated_at, id: item.id }
        }
      }
      setValues(loaded)
      setSaved(savedMap)
    }
    load()
  }, [workspaceId])

  const saveSection = useCallback(async (section: Section) => {
    const content = values[section.key]
    if (!content?.trim()) return
    setSaving(s => ({ ...s, [section.key]: true }))
    try {
      const res = await fetch('/api/v1/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({
          type: section.knowledgeType,
          title: section.label,
          content,
          tags: ['business-memory', section.key],
        }),
      })
      if (res.ok) {
        setSaved(s => ({ ...s, [section.key]: { content, savedAt: new Date().toISOString() } }))
      }
    } finally {
      setSaving(s => ({ ...s, [section.key]: false }))
    }
  }, [values, workspaceId])

  const isSaved = (key: string) => saved[key]?.content === values[key]
  const completedCount = SECTIONS.filter(s => saved[s.key]?.content).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: workspace.color }}
            >
              {workspace.initials}
            </div>
            <span className="text-xs text-[var(--muted-foreground)] font-medium">{workspace.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Business Memory</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            This context is automatically injected into every AI employee — no more re-explaining your business.
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-[var(--primary)]">{completedCount}/{SECTIONS.length}</p>
          <p className="text-xs text-[var(--muted-foreground)]">sections filled</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--primary)] rounded-full transition-all duration-500"
          style={{ width: `${(completedCount / SECTIONS.length) * 100}%` }}
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map(section => {
          const value = values[section.key] || ''
          const isActive = activeSection === section.key
          const done = !!saved[section.key]?.content

          return (
            <div
              key={section.key}
              className={`border rounded-xl overflow-hidden transition-all ${
                isActive ? 'border-[var(--primary)]' : 'border-[var(--border)]'
              } bg-[var(--card)]`}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                onClick={() => setActiveSection(isActive ? null : section.key)}
              >
                <span className="text-xl">{section.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{section.label}</p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{section.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {done && <span className="text-xs text-green-500 font-medium">✓ Saved</span>}
                  <span className="text-[var(--muted-foreground)] text-xs">{isActive ? '▲' : '▼'}</span>
                </div>
              </button>

              {isActive && (
                <div className="px-4 pb-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mt-3 mb-2">{section.description}</p>
                  <textarea
                    value={value}
                    onChange={e => setValues(v => ({ ...v, [section.key]: e.target.value }))}
                    placeholder={section.placeholder}
                    rows={6}
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 resize-y focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {saved[section.key]?.savedAt
                        ? `Last saved ${new Date(saved[section.key].savedAt).toLocaleTimeString()}`
                        : 'Not saved yet'}
                    </p>
                    <button
                      onClick={() => saveSection(section)}
                      disabled={saving[section.key] || !value.trim() || isSaved(section.key)}
                      className="px-4 py-1.5 bg-[var(--primary)] text-white text-xs font-medium rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {saving[section.key] ? 'Saving...' : isSaved(section.key) ? 'Saved ✓' : 'Save to Brain'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[var(--muted-foreground)] text-center pb-4">
        All saved content goes directly into your AI team&apos;s context. The more you fill in, the smarter they get.
      </p>
    </div>
  )
}
