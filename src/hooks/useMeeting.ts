'use client'

import { useState, useCallback, useRef } from 'react'
import { EMPLOYEES, getEmployeeName, Employee } from '@/lib/employees'
import { speakAsEmployee, stopSpeaking } from '@/lib/elevenlabs'

export type MeetingStatus = 'lobby' | 'active' | 'ended'

export interface MeetingParticipant {
  employee: Employee
  isSpeaking: boolean
  hasSpoken: boolean
  lastMessage?: string
}

export interface MeetingMessage {
  id: string
  from: 'user' | string // employee id
  text: string
  timestamp: Date
}

export interface MeetingPreset {
  id: string
  label: string
  emoji: string
  employeeIds: string[]
  description: string
}

export const MEETING_PRESETS: MeetingPreset[] = [
  {
    id: 'content-sprint',
    label: 'Content Sprint',
    emoji: '⚡',
    description: 'Write content fast — all content creators in the room',
    employeeIds: ['james-harper', 'sophia-chen', 'ryan-blake', 'maya-patel', 'ethan-cole', 'olivia-rhodes'],
  },
  {
    id: 'strategy',
    label: 'Strategy Session',
    emoji: '🎯',
    description: 'Research, trends, and planning with your strategy team',
    employeeIds: ['alex-morgan', 'kai-nakamura', 'emma-davis', 'grace-sterling'],
  },
  {
    id: 'all-hands',
    label: 'All Hands',
    emoji: '🏢',
    description: 'Every employee in the room',
    employeeIds: EMPLOYEES.map(e => e.id),
  },
  {
    id: 'publishing',
    label: 'Publishing Review',
    emoji: '🚀',
    description: 'Editor, Publisher, and Assistant review and ship',
    employeeIds: ['liam-foster', 'lucas-wright', 'ava-mitchell'],
  },
  {
    id: 'custom',
    label: 'Custom',
    emoji: '✨',
    description: 'Pick your own team',
    employeeIds: [],
  },
]

const WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

// Detect which employee is being addressed in the message
function detectAddressedEmployee(text: string, participants: MeetingParticipant[]): string | 'all' {
  const lower = text.toLowerCase()

  // Check for direct name addressing: "James, ...", "Hey Sophia, ..."
  for (const p of participants) {
    const firstName = p.employee.defaultName.split(' ')[0].toLowerCase()
    if (
      lower.startsWith(firstName) ||
      lower.startsWith(`hey ${firstName}`) ||
      lower.startsWith(`hi ${firstName}`) ||
      lower.includes(`, ${firstName},`) ||
      lower.includes(`@${firstName}`)
    ) {
      return p.employee.id
    }
    // Also check custom names
    const customName = getEmployeeName(p.employee.id).split(' ')[0].toLowerCase()
    if (customName !== firstName && (lower.startsWith(customName) || lower.startsWith(`hey ${customName}`))) {
      return p.employee.id
    }
  }

  // Check for role-based addressing
  const roleKeywords: Record<string, string> = {
    'researcher': 'alex-morgan',
    'research': 'alex-morgan',
    'blog': 'james-harper',
    'article': 'james-harper',
    'linkedin': 'sophia-chen',
    'twitter': 'ryan-blake',
    'tweet': 'ryan-blake',
    'instagram': 'maya-patel',
    'youtube': 'ethan-cole',
    'newsletter': 'olivia-rhodes',
    'email': 'olivia-rhodes',
    'repurpose': 'noah-bennett',
    'image': 'zara-kim',
    'visual': 'zara-kim',
    'publish': 'lucas-wright',
    'schedule': 'lucas-wright',
    'analytics': 'emma-davis',
    'stats': 'emma-davis',
    'trends': 'kai-nakamura',
    'brand': 'grace-sterling',
    'voice': 'grace-sterling',
    'editor': 'liam-foster',
    'edit': 'liam-foster',
    'inbox': 'ava-mitchell',
    'assistant': 'ava-mitchell',
  }

  for (const [keyword, empId] of Object.entries(roleKeywords)) {
    if (lower.includes(keyword)) {
      const participant = participants.find(p => p.employee.id === empId)
      if (participant) return empId
    }
  }

  return 'all'
}

async function callEmployeeVoiceAPI(
  employeeId: string,
  userMessage: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-workspace-id': WORKSPACE_ID,
  }

  // For meeting voice mode, use a "brief response" system prompt variant
  // Each employee gives a concise spoken response (not full content output)
  try {
    const res = await fetch('/api/v1/voice/respond', {
      method: 'POST',
      headers,
      body: JSON.stringify({ employee_id: employeeId, message: userMessage, mode: 'voice' }),
    })
    const data = await res.json()
    if (data.success) return data.response
  } catch {
    // Fall through to basic response
  }

  // Fallback: employee-specific brief responses
  const name = getEmployeeName(employeeId).split(' ')[0]
  const roleResponses: Record<string, string> = {
    'alex-morgan': `Got it. I'll research that now. Give me a moment to pull together the key angles and keyword opportunities.`,
    'james-harper': `On it. I'll draft the article structure and start writing. Should have something ready shortly.`,
    'sophia-chen': `Perfect. I'll craft a LinkedIn post that positions this well for your audience. Just a moment.`,
    'ryan-blake': `Let's go. I'll keep it tight and punchy — exactly how X likes it.`,
    'maya-patel': `Love it. I'll write something that stops the scroll. Give me a second.`,
    'ethan-cole': `Great angle. I'll script this so it hooks viewers in the first 30 seconds.`,
    'olivia-rhodes': `Lovely. I'll write a newsletter edition that feels personal and delivers real value.`,
    'noah-bennett': `Easy. Tell me what you have and I'll reshape it for every platform.`,
    'zara-kim': `Visual brief received. I'll create something that's on-brand and eye-catching.`,
    'lucas-wright': `Understood. I'll handle the publishing and scheduling across all connected channels.`,
    'emma-davis': `I'll pull the performance data and give you a clear picture of what's working.`,
    'kai-nakamura': `I'm scanning the landscape now. There are some interesting trends emerging in your space.`,
    'grace-sterling': `I'll check the knowledge base and make sure this aligns with your brand voice and positioning.`,
    'liam-foster': `Send it over. I'll check it for AI detection, readability, and brand consistency before it goes out.`,
    'ava-mitchell': `On it. I'll check your inbox and calendar and give you a quick summary.`,
  }

  return roleResponses[employeeId] || `Thanks ${name === getEmployeeName(employeeId).split(' ')[0] ? '' : ', '}I'm working on that now.`
}

export function useMeeting() {
  const [status, setStatus] = useState<MeetingStatus>('lobby')
  const [participants, setParticipants] = useState<MeetingParticipant[]>([])
  const [messages, setMessages] = useState<MeetingMessage[]>([])
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const speakQueueRef = useRef<Array<{ employeeId: string; text: string }>>([])
  const isPlayingRef = useRef(false)

  const startMeeting = useCallback((employeeIds: string[]) => {
    const parts = employeeIds.map(id => {
      const employee = EMPLOYEES.find(e => e.id === id)!
      return { employee, isSpeaking: false, hasSpoken: false }
    })
    setParticipants(parts)
    setMessages([])
    setStatus('active')

    // Welcome message — warm and human, from first participant
    setTimeout(async () => {
      const first = parts[0]
      if (first) {
        // Use the AI to generate a natural welcome rather than a hardcoded string
        let welcomeText: string
        try {
          const res = await fetch('/api/v1/voice/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-workspace-id': WORKSPACE_ID },
            body: JSON.stringify({
              employee_id: first.employee.id,
              message: `The meeting is just starting. There are ${parts.length} team members in this meeting. Welcome everyone and let the founder know you're all ready. Keep it natural and brief.`,
              mode: 'welcome',
            }),
          })
          const data = await res.json()
          welcomeText = data.success ? data.response : `Hey, welcome! Good to have everyone here. There are ${parts.length} of us on the call. Just say a name to direct something to someone, or talk to the group. What are we working on today?`
        } catch {
          welcomeText = `Hey, welcome! Good to have everyone here. There are ${parts.length} of us on the call. Just say a name to direct something to someone, or talk to the group. What are we working on today?`
        }
        addMessage(first.employee.id, welcomeText)
        playVoice(first.employee.id, welcomeText)
      }
    }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const endMeeting = useCallback(() => {
    stopSpeaking()
    speakQueueRef.current = []
    isPlayingRef.current = false
    setActiveSpeakerId(null)
    setStatus('ended')
  }, [])

  const addMessage = useCallback((from: string, text: string) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      from,
      text,
      timestamp: new Date(),
    }])
  }, [])

  const playVoice = useCallback(async (employeeId: string, text: string) => {
    speakQueueRef.current.push({ employeeId, text })
    if (isPlayingRef.current) return

    isPlayingRef.current = true
    while (speakQueueRef.current.length > 0) {
      const item = speakQueueRef.current.shift()!
      setActiveSpeakerId(item.employeeId)
      setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: p.employee.id === item.employeeId })))

      const apiKey = localStorage.getItem('elevenlabs_api_key') || undefined
      try {
        await speakAsEmployee(item.employeeId, item.text, apiKey)
      } catch (e) {
        console.warn('Voice error:', e)
      }

      setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: false })))
      setActiveSpeakerId(null)
    }
    isPlayingRef.current = false
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return

    addMessage('user', text)
    setIsProcessing(true)

    const addressed = detectAddressedEmployee(text, participants)
    const lower = text.toLowerCase().trim()

    // Detect casual conversation
    const isCasual = /^(hi|hey|hello|hiya|yo|sup|what'?s up|howdy|good (morning|afternoon|evening)|how (are|is|you|everyone|it going)|thanks|thank you|cheers|great|awesome|cool|nice|what'?s new)/.test(lower)

    if (addressed === 'all') {
      // For casual messages, pick 1-2 social/outgoing employees
      // For work broadcasts, pick up to 3 relevant employees
      let responders = participants
      if (isCasual) {
        // Pick 1-2 employees — prefer social ones (Sophia, Maya, Ava, Olivia, Ethan)
        const socialOrder = ['sophia-chen', 'maya-patel', 'ava-mitchell', 'olivia-rhodes', 'ethan-cole', 'kai-nakamura']
        const sorted = [...participants].sort((a, b) => {
          const ai = socialOrder.indexOf(a.employee.id)
          const bi = socialOrder.indexOf(b.employee.id)
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
        })
        responders = sorted.slice(0, 2)
      } else {
        responders = participants.slice(0, 3)
      }

      for (const p of responders) {
        try {
          const response = await callEmployeeVoiceAPI(p.employee.id, text)
          addMessage(p.employee.id, response)
          setParticipants(prev => prev.map(part => ({
            ...part,
            isSpeaking: part.employee.id === p.employee.id,
            hasSpoken: part.employee.id === p.employee.id ? true : part.hasSpoken,
            lastMessage: part.employee.id === p.employee.id ? response : part.lastMessage,
          })))
          setActiveSpeakerId(p.employee.id)
          await speakAsEmployee(p.employee.id, response)
          setParticipants(prev => prev.map(part => ({ ...part, isSpeaking: false })))
          setActiveSpeakerId(null)
        } catch (e) {
          console.warn(e)
          setParticipants(prev => prev.map(part => ({ ...part, isSpeaking: false })))
          setActiveSpeakerId(null)
        }
      }
    } else {
      const participant = participants.find(p => p.employee.id === addressed)
      if (participant) {
        try {
          const response = await callEmployeeVoiceAPI(addressed, text)
          addMessage(addressed, response)
          setParticipants(prev => prev.map(p => ({
            ...p,
            isSpeaking: p.employee.id === addressed,
            hasSpoken: p.employee.id === addressed ? true : p.hasSpoken,
            lastMessage: p.employee.id === addressed ? response : p.lastMessage,
          })))
          setActiveSpeakerId(addressed)
          await speakAsEmployee(addressed, response)
          setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: false })))
          setActiveSpeakerId(null)
        } catch (e) {
          console.warn(e)
          setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: false })))
          setActiveSpeakerId(null)
        }
      }
    }

    setIsProcessing(false)
  }, [participants, isProcessing, addMessage])

  return {
    status,
    participants,
    messages,
    activeSpeakerId,
    isProcessing,
    startMeeting,
    endMeeting,
    sendMessage,
  }
}
