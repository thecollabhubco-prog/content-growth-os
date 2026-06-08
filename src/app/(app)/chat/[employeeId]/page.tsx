'use client'

import { useState, useRef, useEffect, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { EMPLOYEES, getEmployee } from '@/lib/employees'
import { useEmployeeNames } from '@/hooks/use-employee-names'
import { cn, relativeTime } from '@/lib/utils'
import Link from 'next/link'
import { useVoice } from '@/hooks/useVoice'
import { stopSpeaking } from '@/lib/elevenlabs'

const WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isLoading?: boolean
  metadata?: Record<string, unknown>
}

function formatContent(content: string): string {
  // Basic markdown-to-html: bold, code, line breaks
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-[var(--muted)] px-1 rounded text-xs">$1</code>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, '<br/>')
}

function getPlaceholder(employeeId: string, name: string): string {
  const placeholders: Record<string, string> = {
    'alex-morgan': `Ask ${name} to research a topic, competitor, or keyword...`,
    'james-harper': `Ask ${name} to write a blog article about...`,
    'sophia-chen': `Ask ${name} to write a LinkedIn post about...`,
    'ryan-blake': `Ask ${name} to write a tweet or thread about...`,
    'maya-patel': `Ask ${name} to write an Instagram caption about...`,
    'ethan-cole': `Ask ${name} to write a YouTube script about...`,
    'olivia-rhodes': `Ask ${name} to write a newsletter about...`,
    'noah-bennett': `Ask ${name} to repurpose your content for another platform...`,
    'zara-kim': `Describe an image you want ${name} to create...`,
    'lucas-wright': `Ask ${name} to check publishing status or connections...`,
    'emma-davis': `Ask ${name} for analytics or performance insights...`,
    'kai-nakamura': `Ask ${name} to scan for trending topics in your industry...`,
    'grace-sterling': `Ask ${name} to add brand voice, personas, or offers to your knowledge base...`,
    'liam-foster': `Paste content for ${name} to review and humanize...`,
    'ava-mitchell': `Ask ${name} to check your inbox, draft a reply, or summarize emails...`,
  }
  return placeholders[employeeId] || `Message ${name}...`
}

async function callEmployeeAPI(
  employeeId: string,
  userMessage: string
): Promise<{ content: string; metadata?: Record<string, unknown> }> {
  const headers = {
    'Content-Type': 'application/json',
    'x-workspace-id': WORKSPACE_ID,
  }

  try {
    switch (employeeId) {
      case 'james-harper': {
        const res = await fetch('/api/v1/generate/blog', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input: { topic: userMessage, keywords: [] }, use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        return {
          content: `Here's your blog article:\n\n**${d.seo_title || d.h1}**\n\n*Meta: ${d.meta_description}*\n\n---\n\n${d.article}`,
          metadata: { content_item_id: d.content_item_id, type: 'blog' },
        }
      }

      case 'sophia-chen': {
        const res = await fetch('/api/v1/generate/linkedin', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input: { topic: userMessage }, format: 'post', use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        return {
          content: `Here's your LinkedIn post:\n\n---\n\n${d.post}\n\n---\n\nHashtags: ${(d.hashtags || []).map((h: string) => `#${h}`).join(' ')}`,
          metadata: { content_item_id: d.content_item_id },
        }
      }

      case 'ryan-blake': {
        const isThread = userMessage.toLowerCase().includes('thread')
        const res = await fetch('/api/v1/generate/x', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input: { topic: userMessage }, format: isThread ? 'thread' : 'post', use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        if (isThread && d.tweets) {
          const tweets = d.tweets.map((t: { number: number; text: string }) => `**${t.number}.** ${t.text}`).join('\n\n')
          return { content: `Here's your thread:\n\n${d.hook_tweet}\n\n${tweets}\n\n${d.closing_tweet}`, metadata: { content_item_id: d.content_item_id } }
        }
        return { content: `Here's your tweet:\n\n"${d.post}"`, metadata: { content_item_id: d.content_item_id } }
      }

      case 'maya-patel': {
        const res = await fetch('/api/v1/generate/instagram', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input: { topic: userMessage }, format: 'caption', use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        return {
          content: `Here's your Instagram caption:\n\n---\n\n${d.caption}\n\n---\n\nHashtags: ${(d.hashtags || []).map((h: string) => `#${h}`).join(' ')}`,
          metadata: { content_item_id: d.content_item_id },
        }
      }

      case 'ethan-cole': {
        const res = await fetch('/api/v1/generate/youtube', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input: { topic: userMessage }, format: 'long_form', use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        const titles = (d.title_options || []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')
        return {
          content: `Here's your YouTube script:\n\n**Title options:**\n${titles}\n\n**Script:**\n\n${d.script}`,
          metadata: { content_item_id: d.content_item_id },
        }
      }

      case 'olivia-rhodes': {
        const res = await fetch('/api/v1/generate/newsletter', {
          method: 'POST',
          headers,
          body: JSON.stringify({ input: { topic: userMessage }, format: 'weekly', use_knowledge_brain: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        return {
          content: `Here's your newsletter:\n\n**Subject:** ${d.subject_line}\n**Preview:** ${d.preview_text}\n\n---\n\n${d.body}\n\n---\n\n${d.ps || ''}`,
          metadata: { content_item_id: d.content_item_id },
        }
      }

      case 'alex-morgan': {
        const res = await fetch('/api/v1/research', {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: userMessage, input_type: 'topic', input_data: userMessage }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        return {
          content: `I've started a deep research session on **"${userMessage}"**.\n\nThis takes 30–60 seconds to complete. I'm searching the web, analyzing competitors, and building your content brief.\n\nSession ID: \`${data.data.session_id}\`\n\nI'll have keyword opportunities, topic clusters, SEO angles, competitor gaps, and recommended content formats ready for you. Check back in a moment or visit the Research section.`,
          metadata: { session_id: data.data.session_id },
        }
      }

      case 'grace-sterling': {
        return {
          content: `To add something to the knowledge base, tell me:\n\n1. **What type** — brand voice, audience persona, offer/service, case study, writing sample, or general context\n2. **A title** for it\n3. **The content**\n\nFor example:\n*"Add our brand voice: We speak like a trusted advisor, not a corporate consultant. We use plain language, real examples, and we never use jargon."*\n\nI'll save it and every team member will use it in their work automatically.`,
        }
      }

      case 'kai-nakamura': {
        const res = await fetch('/api/v1/trends', {
          method: 'POST',
          headers,
          body: JSON.stringify({ industry: userMessage }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        return {
          content: `Trend scan complete. Found **${d.signals_found} signals** in **${userMessage}**.\n\nTop opportunities:\n${(d.trending_topics || []).slice(0, 5).map((t: { topic: string; direction: string; content_opportunity: string }) => `• **${t.topic}** (${t.direction}) — ${t.content_opportunity}`).join('\n')}\n\nRecommended content:\n${(d.recommended_content || []).slice(0, 3).map((c: { title: string; platform: string; urgency: string }) => `• ${c.title} → ${c.platform} (${c.urgency})`).join('\n')}`,
        }
      }

      case 'liam-foster': {
        const res = await fetch('/api/v1/humanize', {
          method: 'POST',
          headers,
          body: JSON.stringify({ content: userMessage, auto_rewrite: true }),
        })
        const data = await res.json()
        if (!data.success) return { content: `I ran into an issue: ${data.error?.message}` }
        const d = data.data
        const score = Math.round((d.analysis?.overall_score || 0) * 100)
        return {
          content: `**Quality Score: ${score}/100**\n\nAI Detection Risk: ${Math.round((d.analysis?.ai_detection_score || 0) * 100)}%\nReadability: ${Math.round((d.analysis?.readability_score || 0) * 100)}%\nNatural Language: ${Math.round((d.analysis?.natural_language_score || 0) * 100)}%\n\n${d.rewrite_applied ? `**Rewritten version:**\n\n${d.humanized_content}` : `Content scored well — no rewrite needed.\n\n${d.analysis?.summary}`}`,
        }
      }

      default: {
        return {
          content: `I'm ${EMPLOYEES.find(e => e.id === employeeId)?.defaultName || 'your AI assistant'}. I'm here to help with ${EMPLOYEES.find(e => e.id === employeeId)?.role?.toLowerCase()}. What do you need me to work on?`,
        }
      }
    }
  } catch (err) {
    return { content: `Something went wrong on my end. Please try again. (${String(err)})` }
  }
}

export default function ChatPage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = use(params)
  const employee = getEmployee(employeeId)
  const { getName, updateName, resetName } = useEmployeeNames()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Voice — auto-submit on transcript
  const handleVoiceTranscript = useCallback((text: string) => {
    if (text && employee) {
      setInput(text)
      // Small delay so input state updates
      setTimeout(() => sendMessageText(text), 50)
    }
  }, [employee]) // eslint-disable-line

  const { state: voiceState, isSupported: voiceSupported, startListening, stopListening, speak } = useVoice({
    employeeId: employee?.id,
    onTranscript: handleVoiceTranscript,
  })

  const name = employee ? getName(employee.id) : 'Employee'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (employee && messages.length === 0) {
      setMessages([{
        id: '0',
        role: 'assistant',
        content: `Hey, I'm **${name}** — your ${employee.role}.\n\n${employee.tagline}\n\nWhat do you need me to work on today?`,
        timestamp: new Date(),
      }])
    }
  }, [employee, name])

  if (!employee) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[var(--muted-foreground)]">Employee not found.</p>
          <Link href="/team" className="text-[var(--primary)] text-sm mt-2 block hover:underline">← Back to team</Link>
        </div>
      </div>
    )
  }

  async function sendMessageText(text: string) {
    if (!text.trim() || sending) return
    const userMsg = text.trim()
    setInput('')
    setSending(true)

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMsg,
      timestamp: new Date(),
    }
    const loadingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages(prev => [...prev, userMessage, loadingMessage])

    const result = await callEmployeeAPI(employee!.id, userMsg)

    setMessages(prev => prev.map(m =>
      m.isLoading ? { ...m, content: result.content, metadata: result.metadata, isLoading: false } : m
    ))
    setSending(false)

    // Auto-speak response if voice enabled
    if (voiceEnabled && result.content) {
      speak(result.content)
    }

    inputRef.current?.focus()
  }

  async function sendMessage() {
    sendMessageText(input)
  }

  function handleVoiceMicClick() {
    if (voiceState === 'listening') {
      stopListening()
    } else {
      stopSpeaking()
      startListening()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] max-w-4xl mx-auto">
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--border)] bg-[var(--card)] shrink-0">
          <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0', employee.bgColor)}>
            {employee.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{name}</span>
              <button
                onClick={() => { setShowRename(true); setRenameValue(name) }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition opacity-60 hover:opacity-100"
                title="Rename"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <p className={cn('text-xs', employee.color)}>{employee.role}</p>
          </div>
          {/* Voice toggle */}
          <button
            onClick={() => setVoiceEnabled(v => !v)}
            title={voiceEnabled ? 'Disable voice replies' : 'Enable voice replies'}
            className={cn(
              'flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition shrink-0',
              voiceEnabled
                ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            )}
          >
            🎙️ {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="text-xs border border-[var(--border)] px-3 py-1.5 rounded-lg hover:bg-[var(--muted)] transition text-[var(--muted-foreground)] shrink-0"
          >
            View profile
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'assistant' && (
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0 mt-0.5', employee.bgColor)}>
                  {employee.emoji}
                </div>
              )}
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[var(--primary)] text-white rounded-br-sm'
                  : 'bg-[var(--muted)] text-[var(--foreground)] rounded-bl-sm'
              )}>
                {msg.isLoading ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--muted-foreground)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <div
                    className="prose-sm"
                    dangerouslySetInnerHTML={{ __html: `<p>${formatContent(msg.content)}</p>` }}
                  />
                )}
                <div className={cn('text-[10px] mt-1.5', msg.role === 'user' ? 'text-white/60 text-right' : 'text-[var(--muted-foreground)]')}>
                  {relativeTime(msg.timestamp)}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5">
                  A
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="px-5 py-4 border-t border-[var(--border)] bg-[var(--card)] shrink-0 space-y-2">
          {/* Voice listening indicator */}
          {voiceState === 'listening' && (
            <div className="flex items-center justify-center gap-2 py-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-1 bg-[var(--primary)] rounded-full"
                  style={{ height: `${8 + i * 3}px`, animation: `audioBar 0.${3+i}s ease-in-out infinite alternate` }} />
              ))}
              <span className="text-xs text-[var(--primary)] font-medium ml-1 animate-pulse">Listening...</span>
            </div>
          )}
          {voiceState === 'speaking' && (
            <div className="flex items-center justify-center gap-2 py-1">
              <span className="text-xs text-emerald-500 font-medium animate-pulse">🔊 {name} is speaking...</span>
              <button onClick={() => stopSpeaking()} className="text-[10px] text-[var(--muted-foreground)] underline">Stop</button>
            </div>
          )}

          <div className="flex gap-3 items-end">
            {/* Mic button */}
            {voiceSupported && (
              <button
                onClick={handleVoiceMicClick}
                disabled={sending || voiceState === 'speaking'}
                title={voiceState === 'listening' ? 'Stop listening' : 'Speak to ' + name}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 border',
                  voiceState === 'listening'
                    ? 'bg-red-500 text-white border-red-500 animate-pulse'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]'
                )}
              >
                {voiceState === 'listening' ? '⏹' : '🎙️'}
              </button>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder(employee.id, name)}
              rows={1}
              disabled={sending}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition disabled:opacity-50 max-h-32"
              style={{ lineHeight: '1.5' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 128) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="w-11 h-11 bg-[var(--primary)] text-white rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition shrink-0"
            >
              {sending ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)] text-center">
            {voiceEnabled ? '🎙️ Voice replies enabled · Click mic to speak' : 'Press Enter to send · Shift+Enter for new line · Click 🎙️ Voice Off to enable voice'}
          </p>
        </div>
      </div>

      {/* Rename Modal */}
      {showRename && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold mb-4">Rename {name}</h3>
            <input
              autoFocus
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { updateName(employee.id, renameValue); setShowRename(false) }
                if (e.key === 'Escape') setShowRename(false)
              }}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition mb-4"
              placeholder="Enter new name..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => { updateName(employee.id, renameValue); setShowRename(false) }}
                className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition"
              >
                Save name
              </button>
              <button
                onClick={() => { resetName(employee.id); setShowRename(false) }}
                className="border border-[var(--border)] px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition"
              >
                Reset
              </button>
              <button
                onClick={() => setShowRename(false)}
                className="border border-[var(--border)] px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={cn('h-24 flex items-center justify-center relative', employee.bgColor)}>
              <span className="text-5xl">{employee.emoji}</span>
              <button onClick={() => setShowProfile(false)} className="absolute top-3 right-3 w-7 h-7 bg-black/20 rounded-full flex items-center justify-center text-white text-sm hover:bg-black/40 transition">✕</button>
            </div>
            <div className="p-6">
              <h2 className="text-lg font-bold mb-0.5">{name}</h2>
              <p className={cn('text-sm font-medium mb-1', employee.color)}>{employee.role}</p>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">{employee.department} Department</p>
              <p className="text-sm leading-relaxed mb-5">{employee.description}</p>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Responsibilities</h4>
                <ul className="space-y-1.5">
                  {employee.responsibilities.map(r => (
                    <li key={r} className="flex items-center gap-2 text-sm">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', employee.bgColor)} />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
