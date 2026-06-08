'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useRef, useCallback, useEffect } from 'react'
import { speakAsEmployee, stopSpeaking } from '@/lib/elevenlabs'

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking'

interface UseVoiceOptions {
  employeeId?: string
  onTranscript?: (text: string) => void
  onSpeakStart?: () => void
  onSpeakEnd?: () => void
}

export function useVoice({
  employeeId,
  onTranscript,
  onSpeakStart,
  onSpeakEnd,
}: UseVoiceOptions = {}) {
  const [state, setVoiceState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    setIsSupported(supported)
  }, [])

  const startListening = useCallback(() => {
    if (!isSupported) return

    stopSpeaking()
    setTranscript('')
    setVoiceState('listening')

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SR()
    recognitionRef.current = recognition

    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-GB'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += t
        } else {
          interimTranscript += t
        }
      }

      setTranscript(finalTranscript || interimTranscript)

      if (finalTranscript) {
        setVoiceState('processing')
        onTranscript?.(finalTranscript.trim())
      }
    }

    recognition.onerror = () => {
      setVoiceState('idle')
    }

    recognition.onend = () => {
      setVoiceState('idle')
    }

    recognition.start()
  }, [isSupported, onTranscript])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setVoiceState('idle')
  }, [])

  const speak = useCallback(async (text: string, empId?: string) => {
    const targetEmployee = empId || employeeId
    if (!targetEmployee) return

    setVoiceState('speaking')
    onSpeakStart?.()

    const apiKey = localStorage.getItem('elevenlabs_api_key') || undefined

    try {
      await speakAsEmployee(targetEmployee, text, apiKey)
    } finally {
      setVoiceState('idle')
      onSpeakEnd?.()
    }
  }, [employeeId, onSpeakStart, onSpeakEnd])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    stopSpeaking()
    setVoiceState('idle')
  }, [])

  return {
    state,
    transcript,
    isSupported,
    startListening,
    stopListening,
    speak,
    stop,
    isListening: state === 'listening',
    isSpeaking: state === 'speaking',
    isProcessing: state === 'processing',
  }
}
