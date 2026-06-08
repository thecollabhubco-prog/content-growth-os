'use client'

import { useEffect, useRef } from 'react'
import { MeetingMessage } from '@/hooks/useMeeting'
import { EMPLOYEES, getEmployeeName } from '@/lib/employees'
import { cn } from '@/lib/utils'

interface MeetingTranscriptProps {
  messages: MeetingMessage[]
  activeSpeakerId: string | null
}

export default function MeetingTranscript({ messages, activeSpeakerId }: MeetingTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-[var(--muted-foreground)] text-center">
          Start speaking to begin the meeting transcript
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
      {messages.map((msg) => {
        const isUser = msg.from === 'user'
        const employee = !isUser ? EMPLOYEES.find(e => e.id === msg.from) : null
        const name = isUser ? 'You' : getEmployeeName(msg.from)
        const isSpeaking = msg.from === activeSpeakerId

        return (
          <div
            key={msg.id}
            className={cn(
              'flex gap-3 transition-all duration-300',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold',
                isUser
                  ? 'bg-[var(--primary)] text-white'
                  : employee?.bgColor || 'bg-[var(--muted)]'
              )}
            >
              {isUser ? 'A' : employee?.emoji || '?'}
            </div>

            {/* Message bubble */}
            <div className={cn('flex flex-col gap-1 max-w-[75%]', isUser ? 'items-end' : 'items-start')}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--muted-foreground)] font-medium">{name}</span>
                {isSpeaking && (
                  <span className="text-[9px] text-[var(--primary)] font-semibold uppercase tracking-wide animate-pulse">Speaking</span>
                )}
              </div>
              <div
                className={cn(
                  'rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  isUser
                    ? 'bg-[var(--primary)] text-white rounded-tr-sm'
                    : isSpeaking
                    ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--foreground)] rounded-tl-sm'
                    : 'bg-[var(--muted)] text-[var(--foreground)] rounded-tl-sm'
                )}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-[var(--muted-foreground)]">
                {msg.timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
