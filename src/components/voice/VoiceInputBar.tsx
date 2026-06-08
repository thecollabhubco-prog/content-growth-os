'use client'

import { useState, useCallback } from 'react'
import { Mic, MicOff, Send, Square } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { cn } from '@/lib/utils'
import { stopSpeaking } from '@/lib/elevenlabs'

interface VoiceInputBarProps {
  onSend: (text: string) => void
  isProcessing: boolean
  isMeetingActive: boolean
}

export default function VoiceInputBar({ onSend, isProcessing, isMeetingActive }: VoiceInputBarProps) {
  const [textInput, setTextInput] = useState('')
  const [voiceMode, setVoiceMode] = useState(true)

  const handleTranscript = useCallback((text: string) => {
    if (text) {
      onSend(text)
    }
  }, [onSend])

  const { state, transcript, isSupported, startListening, stopListening } = useVoice({
    onTranscript: handleTranscript,
  })

  const handleSend = () => {
    if (textInput.trim()) {
      onSend(textInput.trim())
      setTextInput('')
    }
  }

  const handleMicClick = () => {
    if (state === 'listening') {
      stopListening()
    } else {
      stopSpeaking() // Stop any playing voice first
      startListening()
    }
  }

  const isListening = state === 'listening'
  const isProcessingVoice = state === 'processing'

  return (
    <div className="space-y-3">
      {/* Listening indicator */}
      {isListening && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex items-end gap-0.5 h-5">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="w-1 bg-[var(--primary)] rounded-full"
                style={{
                  height: `${Math.random() * 16 + 4}px`,
                  animation: `audioBar 0.${3 + i}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-[var(--primary)] font-medium animate-pulse">
            Listening... speak now
          </span>
        </div>
      )}

      {isProcessingVoice && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-sm text-[var(--muted-foreground)]">Processing...</span>
        </div>
      )}

      {/* Transcript preview */}
      {transcript && isListening && (
        <div className="text-sm text-center text-[var(--muted-foreground)] italic px-4">
          "{transcript}"
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-3">
        {/* Voice mode toggle */}
        <button
          onClick={() => setVoiceMode(v => !v)}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center text-sm border transition-colors',
            voiceMode
              ? 'bg-[var(--primary)]/10 border-[var(--primary)]/40 text-[var(--primary)]'
              : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          )}
          title={voiceMode ? 'Switch to text input' : 'Switch to voice input'}
        >
          {voiceMode ? <Mic size={16} /> : '⌨️'}
        </button>

        {voiceMode ? (
          /* Voice mode — big mic button */
          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={handleMicClick}
              disabled={isProcessing || isProcessingVoice || !isSupported}
              className={cn(
                'relative flex items-center gap-3 px-8 py-3 rounded-2xl font-medium text-sm transition-all duration-200',
                isListening
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                  : isProcessing
                  ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed'
                  : 'bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 hover:scale-105 shadow-lg shadow-[var(--primary)]/20'
              )}
            >
              {isListening ? (
                <>
                  <Square size={16} className="fill-white" />
                  Stop Listening
                </>
              ) : isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--muted-foreground)] border-t-transparent rounded-full animate-spin" />
                  AI is responding...
                </>
              ) : (
                <>
                  <Mic size={16} />
                  {!isSupported ? 'Voice not supported' : 'Hold to Speak'}
                </>
              )}

              {/* Pulse ring when listening */}
              {isListening && (
                <div className="absolute inset-0 rounded-2xl bg-red-500 animate-ping opacity-20" />
              )}
            </button>
          </div>
        ) : (
          /* Text mode */
          <div className="flex-1 flex items-center gap-2">
            <input
              className="flex-1 bg-[var(--muted)] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/50 border border-[var(--border)] focus:border-[var(--primary)]/50"
              placeholder="Type to any employee... (e.g. 'James, write a blog post about...')"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={isProcessing}
            />
            <button
              onClick={handleSend}
              disabled={!textInput.trim() || isProcessing}
              className="w-10 h-10 bg-[var(--primary)] text-white rounded-xl flex items-center justify-center hover:bg-[var(--primary)]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        )}

        {/* Stop speaking button */}
        <button
          onClick={() => stopSpeaking()}
          className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors"
          title="Stop speaking"
        >
          <MicOff size={16} />
        </button>
      </div>

      {/* Hint */}
      {isMeetingActive && (
        <p className="text-center text-[10px] text-[var(--muted-foreground)]">
          💡 Address by name: <span className="font-medium">"Sophia, write me a LinkedIn post..."</span> · or speak to all: <span className="font-medium">"Team, what should we focus on today?"</span>
        </p>
      )}
    </div>
  )
}
