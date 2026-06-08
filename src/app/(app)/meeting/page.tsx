'use client'

import { useState } from 'react'
import { Phone, PhoneOff, Users, Settings2, ChevronRight } from 'lucide-react'
import { EMPLOYEES } from '@/lib/employees'
import { useMeeting, MEETING_PRESETS, MeetingPreset } from '@/hooks/useMeeting'
import EmployeeCard from '@/components/voice/EmployeeCard'
import MeetingTranscript from '@/components/voice/MeetingTranscript'
import VoiceInputBar from '@/components/voice/VoiceInputBar'
import { cn } from '@/lib/utils'

// ── Lobby ────────────────────────────────────────────────────────────────────
function MeetingLobby({ onStart }: { onStart: (ids: string[]) => void }) {
  const [selectedPreset, setSelectedPreset] = useState<MeetingPreset>(MEETING_PRESETS[0])
  const [customIds, setCustomIds] = useState<Set<string>>(new Set())
  const [showElevenLabsSetup, setShowElevenLabsSetup] = useState(false)
  const [elevenLabsKey, setElevenLabsKey] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('elevenlabs_api_key') || '' : ''
  )

  const isCustom = selectedPreset.id === 'custom'
  const finalIds = isCustom ? Array.from(customIds) : selectedPreset.employeeIds

  function saveElevenLabsKey() {
    localStorage.setItem('elevenlabs_api_key', elevenLabsKey.trim())
    setShowElevenLabsSetup(false)
  }

  function toggleEmployee(id: string) {
    setCustomIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Voice Meeting Room</h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Start a live voice meeting with your AI team. Speak naturally — address them by name or broadcast to everyone.
        </p>
      </div>

      {/* Meeting Presets */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Choose Your Meeting Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MEETING_PRESETS.map(preset => (
            <button
              key={preset.id}
              onClick={() => setSelectedPreset(preset)}
              className={cn(
                'text-left p-4 rounded-xl border transition-all duration-200',
                selectedPreset.id === preset.id
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 shadow-md shadow-[var(--primary)]/10'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/40'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{preset.emoji}</span>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">{preset.label}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{preset.description}</div>
                  {preset.id !== 'custom' && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {preset.employeeIds.slice(0, 4).map(id => {
                        const emp = EMPLOYEES.find(e => e.id === id)
                        return emp ? (
                          <span key={id} className="text-[10px] bg-[var(--muted)] rounded-full px-2 py-0.5">
                            {emp.emoji} {emp.defaultName.split(' ')[0]}
                          </span>
                        ) : null
                      })}
                      {preset.employeeIds.length > 4 && (
                        <span className="text-[10px] bg-[var(--muted)] rounded-full px-2 py-0.5 text-[var(--muted-foreground)]">
                          +{preset.employeeIds.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {selectedPreset.id === preset.id && (
                  <ChevronRight size={16} className="text-[var(--primary)] ml-auto flex-shrink-0 mt-0.5" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Employee Picker */}
      {isCustom && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-[var(--muted-foreground)]">Select Employees</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {EMPLOYEES.map(emp => {
              const selected = customIds.has(emp.id)
              return (
                <button
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all duration-150',
                    selected
                      ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-[var(--border)] hover:border-[var(--primary)]/40'
                  )}
                >
                  <span className="text-2xl">{emp.emoji}</span>
                  <span className="text-[10px] font-medium leading-tight">{emp.defaultName.split(' ')[0]}</span>
                  <span className="text-[9px] text-[var(--muted-foreground)] leading-tight">{emp.role}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Voice Settings */}
      <div className="space-y-3">
        <button
          onClick={() => setShowElevenLabsSetup(s => !s)}
          className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <Settings2 size={14} />
          {elevenLabsKey ? '✓ ElevenLabs connected (realistic voices)' : 'Add ElevenLabs API key for realistic voices (optional)'}
        </button>
        {showElevenLabsSetup && (
          <div className="flex gap-2 items-center p-4 bg-[var(--muted)] rounded-xl">
            <input
              type="password"
              placeholder="sk-..."
              value={elevenLabsKey}
              onChange={e => setElevenLabsKey(e.target.value)}
              className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button
              onClick={saveElevenLabsKey}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary)]/90 transition-colors"
            >
              Save
            </button>
          </div>
        )}
        {!elevenLabsKey && (
          <p className="text-xs text-[var(--muted-foreground)]">
            Without ElevenLabs, your browser's built-in voices will be used. Each employee still has a unique voice setting.
          </p>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={() => finalIds.length > 0 && onStart(finalIds)}
        disabled={finalIds.length === 0}
        className={cn(
          'w-full py-4 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all duration-200',
          finalIds.length > 0
            ? 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-xl shadow-[var(--primary)]/20 hover:scale-[1.02]'
            : 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
        )}
      >
        <Phone size={20} />
        Start Meeting with {finalIds.length} Employee{finalIds.length !== 1 ? 's' : ''}
      </button>
    </div>
  )
}

// ── Active Meeting Room ───────────────────────────────────────────────────────
function ActiveMeeting({
  participants,
  messages,
  activeSpeakerId,
  isProcessing,
  onSend,
  onEnd,
}: {
  participants: ReturnType<typeof useMeeting>['participants']
  messages: ReturnType<typeof useMeeting>['messages']
  activeSpeakerId: string | null
  isProcessing: boolean
  onSend: (text: string) => void
  onEnd: () => void
}) {
  // Responsive grid: 2 col for small meetings, 3-4 for larger
  const gridCols = participants.length <= 2
    ? 'grid-cols-2'
    : participants.length <= 6
    ? 'grid-cols-3'
    : participants.length <= 9
    ? 'grid-cols-4 md:grid-cols-5'
    : 'grid-cols-5 md:grid-cols-6'

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium">Meeting Active</span>
          <span className="text-xs text-[var(--muted-foreground)]">· {participants.length} participant{participants.length !== 1 ? 's' : ''}</span>
        </div>
        <button
          onClick={onEnd}
          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
        >
          <PhoneOff size={16} />
          End Meeting
        </button>
      </div>

      {/* Main layout: video grid + transcript side-by-side on desktop */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Employee grid */}
        <div className="flex flex-col gap-4 w-full md:w-auto md:flex-shrink-0">
          <div className={cn('grid gap-3', gridCols, participants.length > 9 ? 'auto-rows-fr' : '')}>
            {participants.map(p => (
              <EmployeeCard
                key={p.employee.id}
                employee={p.employee}
                isSpeaking={activeSpeakerId === p.employee.id}
                hasSpoken={p.hasSpoken}
                lastMessage={p.lastMessage}
                isSmall={participants.length > 6}
              />
            ))}
          </div>
        </div>

        {/* Transcript — hidden on small screens, visible md+ */}
        <div className="hidden md:flex flex-col flex-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-[var(--muted-foreground)]" />
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Meeting Transcript</span>
          </div>
          <MeetingTranscript messages={messages} activeSpeakerId={activeSpeakerId} />
        </div>
      </div>

      {/* Voice input bar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
        <VoiceInputBar onSend={onSend} isProcessing={isProcessing} isMeetingActive={true} />
      </div>
    </div>
  )
}

// ── Meeting Ended ─────────────────────────────────────────────────────────────
function MeetingEnded({ messages, onRestart }: { messages: ReturnType<typeof useMeeting>['messages']; onRestart: () => void }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meeting Ended</h1>
        <p className="text-[var(--muted-foreground)] mt-1">{messages.length} messages in this session</p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 max-h-96 overflow-y-auto space-y-3">
        <h2 className="font-semibold text-sm text-[var(--muted-foreground)] uppercase tracking-wide">Transcript</h2>
        <MeetingTranscript messages={messages} activeSpeakerId={null} />
      </div>

      <button
        onClick={onRestart}
        className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-medium hover:bg-[var(--primary)]/90 transition-colors"
      >
        Start New Meeting
      </button>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function MeetingPage() {
  const { status, participants, messages, activeSpeakerId, isProcessing, startMeeting, endMeeting, sendMessage } = useMeeting()

  if (status === 'lobby') {
    return (
      <div className="p-4 md:p-6">
        <MeetingLobby onStart={startMeeting} />
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="p-4 md:p-6">
        <ActiveMeeting
          participants={participants}
          messages={messages}
          activeSpeakerId={activeSpeakerId}
          isProcessing={isProcessing}
          onSend={sendMessage}
          onEnd={endMeeting}
        />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <MeetingEnded messages={messages} onRestart={() => window.location.reload()} />
    </div>
  )
}
