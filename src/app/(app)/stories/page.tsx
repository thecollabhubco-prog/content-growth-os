'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/workspace/context'

interface StoryQuestion {
  id: string
  category: string
  question: string
  followUp?: string
  example?: string
}

const QUESTION_BANK: StoryQuestion[] = [
  // Origin
  { id: 'origin-1', category: 'Origin Story', question: 'What were you doing before this business? What made you leave?', example: 'I was working in corporate finance, managing other people\'s money but feeling like...' },
  { id: 'origin-2', category: 'Origin Story', question: 'What was the exact moment you decided to start? What happened?', example: 'It was a Tuesday. I\'d just been passed over for the third promotion...' },
  { id: 'origin-3', category: 'Origin Story', question: 'What did people say when you told them your idea? Who doubted you?', followUp: 'And who believed in you first?' },

  // Failures & Lessons
  { id: 'fail-1', category: 'Failures & Lessons', question: 'What\'s the most expensive mistake you\'ve made in business? What did it cost you and what did you learn?', example: 'I hired too fast and had to let 3 people go within 6 months...' },
  { id: 'fail-2', category: 'Failures & Lessons', question: 'Tell me about a time you almost quit. What kept you going?', followUp: 'What would have happened if you had quit?' },
  { id: 'fail-3', category: 'Failures & Lessons', question: 'What\'s something you believed about business 3 years ago that you now know is completely wrong?' },

  // Wins
  { id: 'win-1', category: 'Wins & Milestones', question: 'What\'s the win you\'re most proud of? Not the biggest revenue — the one that meant the most.', example: 'It wasn\'t the £100k month. It was when my first client messaged me saying...' },
  { id: 'win-2', category: 'Wins & Milestones', question: 'What\'s a moment when a client\'s life or business actually changed because of your work?' },
  { id: 'win-3', category: 'Wins & Milestones', question: 'When did you first feel like this was going to work? What happened?' },

  // Beliefs & Values
  { id: 'belief-1', category: 'Beliefs & Values', question: 'What do you believe about business/success that most people in your industry disagree with?', example: 'I believe most founders should stay small on purpose...' },
  { id: 'belief-2', category: 'Beliefs & Values', question: 'What\'s a rule you live by that you\'d tell every founder you meet?', followUp: 'Where did this rule come from? Was there a moment?' },
  { id: 'belief-3', category: 'Beliefs & Values', question: 'What does success actually look like to you — not the LinkedIn version?' },

  // Daily Life
  { id: 'daily-1', category: 'Daily Life', question: 'Walk me through your typical day. What\'s your morning like before work starts?', example: 'I wake up at 6 without an alarm. First 90 minutes I don\'t touch my phone...' },
  { id: 'daily-2', category: 'Daily Life', question: 'What do you do when you\'re stuck or overwhelmed? What\'s your reset?', followUp: 'Has this always been your way?' },
  { id: 'daily-3', category: 'Daily Life', question: 'What obsession or habit do you have that most people would find odd but you swear by?' },

  // Personal
  { id: 'personal-1', category: 'Personal', question: 'What part of your background (family, culture, upbringing) shaped how you think about business?', example: 'Growing up, my parents ran a corner shop. I watched my dad...' },
  { id: 'personal-2', category: 'Personal', question: 'Who is the most influential person in your life (mentor, parent, friend) and what did they teach you?' },
  { id: 'personal-3', category: 'Personal', question: 'What do you want to be remembered for? Not professionally — as a person.' },

  // Future
  { id: 'future-1', category: 'Future Vision', question: 'What does your life look like in 5 years? Be specific — where are you, what are you doing, who are you with?', example: 'I\'m working from a flat in Lisbon. The business runs without me 3 days a week...' },
  { id: 'future-2', category: 'Future Vision', question: 'What problem do you want your business to have solved in 10 years? At scale?', followUp: 'And what would make you walk away from it all?' },
]

const CATEGORIES = [...new Set(QUESTION_BANK.map(q => q.category))]

interface StoryAnswer {
  questionId: string
  question: string
  answer: string
  savedAt: string
}

export default function StoriesPage() {
  const { workspaceId } = useWorkspace()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, StoryAnswer>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [activeQ, setActiveQ] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0])

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/v1/stories?workspace_id=${workspaceId}`)
      if (!res.ok) return
      const { data } = await res.json()
      if (!data?.stories) return
      const savedMap: Record<string, StoryAnswer> = {}
      const answersMap: Record<string, string> = {}
      for (const s of data.stories) {
        const q = QUESTION_BANK.find(q => q.id === s.question_id)
        if (q) {
          savedMap[q.id] = { questionId: q.id, question: q.question, answer: s.answer, savedAt: s.created_at }
          answersMap[q.id] = s.answer
        }
      }
      setSaved(savedMap)
      setAnswers(answersMap)
    }
    load()
  }, [workspaceId])

  const saveAnswer = async (q: StoryQuestion) => {
    const answer = answers[q.id]
    if (!answer?.trim()) return
    setSaving(s => ({ ...s, [q.id]: true }))
    try {
      const res = await fetch('/api/v1/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({ question_id: q.id, question: q.question, answer, category: q.category }),
      })
      if (res.ok) {
        setSaved(s => ({ ...s, [q.id]: { questionId: q.id, question: q.question, answer, savedAt: new Date().toISOString() } }))
      }
    } finally {
      setSaving(s => ({ ...s, [q.id]: false }))
    }
  }

  const categoryQuestions = QUESTION_BANK.filter(q => q.category === activeCategory)
  const totalAnswered = Object.keys(saved).length

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">My Stories</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Answer these questions to build your personal story bank. Your AI team uses these to write content that sounds like <em>you</em> — not like everyone else.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--primary)]">{totalAnswered}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Stories captured</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">{QUESTION_BANK.length - totalAnswered}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Still to answer</p>
        </div>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-[var(--foreground)]">{CATEGORIES.length}</p>
          <p className="text-xs text-[var(--muted-foreground)]">Categories</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map(cat => {
          const answered = QUESTION_BANK.filter(q => q.category === cat && saved[q.id]).length
          const total = QUESTION_BANK.filter(q => q.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {cat} {answered > 0 && <span className="opacity-70">({answered}/{total})</span>}
            </button>
          )
        })}
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {categoryQuestions.map(q => {
          const isActive = activeQ === q.id
          const answer = answers[q.id] || ''
          const isSaved = saved[q.id]?.answer === answer && answer.length > 0
          const hasSaved = !!saved[q.id]

          return (
            <div
              key={q.id}
              className={`border rounded-xl overflow-hidden bg-[var(--card)] transition-all ${
                isActive ? 'border-[var(--primary)]' : 'border-[var(--border)]'
              }`}
            >
              <button
                className="w-full flex items-start gap-3 px-4 py-3 text-left"
                onClick={() => setActiveQ(isActive ? null : q.id)}
              >
                <span className="text-lg mt-0.5">{hasSaved ? '✅' : '💬'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] leading-snug">{q.question}</p>
                  {hasSaved && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                      {saved[q.id].answer.slice(0, 80)}...
                    </p>
                  )}
                </div>
                <span className="text-[var(--muted-foreground)] text-xs shrink-0 mt-1">{isActive ? '▲' : '▼'}</span>
              </button>

              {isActive && (
                <div className="px-4 pb-4 border-t border-[var(--border)]">
                  {q.followUp && (
                    <p className="text-xs text-[var(--primary)] mt-3 mb-1 font-medium">
                      💡 Follow-up: {q.followUp}
                    </p>
                  )}
                  {q.example && !answer && (
                    <p className="text-xs text-[var(--muted-foreground)] italic mt-3 mb-2">
                      Example: &quot;{q.example}&quot;
                    </p>
                  )}
                  {!q.example && <div className="mt-3" />}
                  <textarea
                    value={answer}
                    onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Write your answer here — be specific, use real details, tell it like a story..."
                    rows={5}
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 resize-y focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {hasSaved
                        ? `Saved ${new Date(saved[q.id].savedAt).toLocaleDateString()}`
                        : 'Not saved — your AI team can\'t use this yet'}
                    </p>
                    <button
                      onClick={() => saveAnswer(q)}
                      disabled={saving[q.id] || !answer.trim() || isSaved}
                      className="px-4 py-1.5 bg-[var(--primary)] text-white text-xs font-medium rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
                    >
                      {saving[q.id] ? 'Saving...' : isSaved ? 'Saved ✓' : 'Save Story'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
