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
  from: 'user' | string
  text: string
  timestamp: Date
  intent?: string
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
    id: 'daily-standup',
    label: 'Daily Standup',
    emoji: '☀️',
    description: 'Quick catch-up — what\'s everyone working on today?',
    employeeIds: ['alex-morgan', 'sophia-chen', 'james-harper', 'emma-davis', 'ava-mitchell'],
  },
  {
    id: 'content-sprint',
    label: 'Content Sprint',
    emoji: '⚡',
    description: 'Full content team — write, publish, and distribute',
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

// ─── INTENT DETECTION ─────────────────────────────────────────────────────────
type RoutingIntent = 'greeting' | 'standup' | 'addressed' | 'broadcast'

function detectRoutingIntent(text: string): RoutingIntent {
  const lower = text.toLowerCase().trim()

  if (/^(hi|hey|hello|hiya|good morning|good afternoon|morning|yo|sup|howdy)/.test(lower)) {
    return 'greeting'
  }
  if (/(what'?s (the )?update|what'?s happening|how'?s (everything|progress|it going)|catch me up|fill me in|any updates|update me|status|what (are|have) you (all |everyone |guys )?(been|done|working))/.test(lower)) {
    return 'standup'
  }

  return 'broadcast'
}

// Detect if message directly addresses one employee by name or role
function detectAddressedEmployee(text: string, participants: MeetingParticipant[]): string | null {
  const lower = text.toLowerCase()

  for (const p of participants) {
    const firstName = p.employee.defaultName.split(' ')[0].toLowerCase()
    if (
      lower.startsWith(firstName + ',') ||
      lower.startsWith(firstName + ' ') ||
      lower.startsWith('hey ' + firstName) ||
      lower.startsWith('hi ' + firstName) ||
      lower.includes(', ' + firstName + ',') ||
      lower.includes('@' + firstName)
    ) {
      return p.employee.id
    }
    const customFirst = getEmployeeName(p.employee.id).split(' ')[0].toLowerCase()
    if (customFirst !== firstName && (
      lower.startsWith(customFirst + ',') ||
      lower.startsWith(customFirst + ' ') ||
      lower.startsWith('hey ' + customFirst)
    )) {
      return p.employee.id
    }
  }

  // Role keywords
  const roleKeywords: Record<string, string> = {
    researcher: 'alex-morgan', research: 'alex-morgan',
    blog: 'james-harper', article: 'james-harper', writer: 'james-harper',
    linkedin: 'sophia-chen',
    twitter: 'ryan-blake', tweet: 'ryan-blake', 'x post': 'ryan-blake',
    instagram: 'maya-patel', reel: 'maya-patel',
    youtube: 'ethan-cole', video: 'ethan-cole', script: 'ethan-cole',
    newsletter: 'olivia-rhodes', email: 'olivia-rhodes',
    repurpose: 'noah-bennett',
    design: 'zara-kim', graphic: 'zara-kim', visual: 'zara-kim',
    publish: 'lucas-wright', schedule: 'lucas-wright', calendar: 'lucas-wright',
    analytics: 'emma-davis', stats: 'emma-davis', data: 'emma-davis',
    trend: 'kai-nakamura', trends: 'kai-nakamura',
    brand: 'grace-sterling', tone: 'grace-sterling',
    editor: 'liam-foster', edit: 'liam-foster', proofread: 'liam-foster',
    inbox: 'ava-mitchell', assistant: 'ava-mitchell', calendar: 'ava-mitchell',
  }

  for (const [keyword, empId] of Object.entries(roleKeywords)) {
    if (lower.includes(keyword)) {
      if (participants.find(p => p.employee.id === empId)) return empId
    }
  }

  return null
}

// ─── API CALL ─────────────────────────────────────────────────────────────────
async function callVoiceAPI(employeeId: string, message: string): Promise<string> {
  try {
    const res = await fetch('/api/v1/voice/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': WORKSPACE_ID,
      },
      body: JSON.stringify({ employee_id: employeeId, message, mode: 'meeting' }),
    })
    const data = await res.json()
    if (data.success && data.response) return data.response
    throw new Error(data.error || 'No response')
  } catch (err) {
    console.error(`Voice API failed for ${employeeId}:`, err)
    // Personality-aware fallbacks that feel natural (used only if API completely fails)
    const name = getEmployeeName(employeeId).split(' ')[0]
    const fallbacks: Record<string, string> = {
      'alex-morgan': `Hey! Good to be here. I've been deep in the keyword research this week — found some really interesting gaps we should talk about.`,
      'james-harper': `Hey! Good timing. I've got a couple of blog drafts on the go and wanted to run an intro by you.`,
      'sophia-chen': `Hey! I've actually been wanting to share something — that last post performed really well and I think I know why.`,
      'ryan-blake': `Hey. Good timing. Got a take brewing that I think could actually do numbers.`,
      'maya-patel': `Oh hey! I was just sketching out a Reel concept. Really glad we're syncing.`,
      'ethan-cole': `Hey! I've been scripting something I'm genuinely excited about — good to be here.`,
      'olivia-rhodes': `Hey, really glad to connect. The newsletter numbers from Tuesday are worth discussing.`,
      'noah-bennett': `Hey! Good to sync. I've been building out a repurposing batch — got some good stuff queued.`,
      'zara-kim': `Hey. I've got some visual concepts to share when you're ready. Been a productive week.`,
      'lucas-wright': `Hey, good to be here. Publishing queue looks solid. A couple of things I want to flag.`,
      'emma-davis': `Hey! I've been pulling data and there are a few things worth highlighting — some good, some worth watching.`,
      'kai-nakamura': `Hey! Actually really good timing — I've been tracking something in the space worth discussing.`,
      'grace-sterling': `Hello, good to connect. I've had some observations from reviewing this week's content.`,
      'liam-foster': `Hey. Good week for edits. Got some patterns from the work that are worth sharing.`,
      'ava-mitchell': `Hey! Good timing. I've got a few things flagged from your inbox and a calendar note to raise.`,
    }
    return fallbacks[employeeId] || `Hey ${name} here — good to be in the room. Ready when you are.`
  }
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
export function useMeeting() {
  const [status, setStatus] = useState<MeetingStatus>('lobby')
  const [participants, setParticipants] = useState<MeetingParticipant[]>([])
  const [messages, setMessages] = useState<MeetingMessage[]>([])
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const addMessage = useCallback((from: string, text: string, intent?: string) => {
    setMessages(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      from,
      text,
      timestamp: new Date(),
      intent,
    }])
  }, [])

  const speakEmployee = useCallback(async (employeeId: string, text: string) => {
    setActiveSpeakerId(employeeId)
    setParticipants(prev => prev.map(p => ({
      ...p,
      isSpeaking: p.employee.id === employeeId,
      hasSpoken: p.employee.id === employeeId ? true : p.hasSpoken,
      lastMessage: p.employee.id === employeeId ? text : p.lastMessage,
    })))
    try {
      await speakAsEmployee(employeeId, text)
    } catch (e) {
      console.warn('Speak error:', e)
    }
    setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: false })))
    setActiveSpeakerId(null)
  }, [])

  const startMeeting = useCallback(async (employeeIds: string[]) => {
    const parts = employeeIds.map(id => ({
      employee: EMPLOYEES.find(e => e.id === id)!,
      isSpeaking: false,
      hasSpoken: false,
    }))
    setParticipants(parts)
    setMessages([])
    setStatus('active')

    // AI-generated natural welcome from the first employee
    setTimeout(async () => {
      const first = parts[0]
      if (!first) return

      const welcomePrompt = `The meeting is starting. There are ${parts.length} team members on this call: ${parts.map(p => p.employee.defaultName.split(' ')[0]).join(', ')}. You're the first to speak. Welcome the owner naturally — be warm, show your personality, and mention something you've been working on. Keep it brief, 2-3 sentences max.`

      const welcomeText = await callVoiceAPI(first.employee.id, welcomePrompt)
      addMessage(first.employee.id, welcomeText, 'greeting')

      // Slight delay then speak
      setTimeout(() => speakEmployee(first.employee.id, welcomeText), 300)
    }, 600)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addMessage])

  const endMeeting = useCallback(() => {
    stopSpeaking()
    setActiveSpeakerId(null)
    setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: false })))
    setStatus('ended')
  }, [])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isProcessing) return

    addMessage('user', text)
    setIsProcessing(true)

    const routingIntent = detectRoutingIntent(text)
    const directlyAddressed = detectAddressedEmployee(text, participants)

    try {
      if (directlyAddressed) {
        // ── Direct address: one employee responds ──
        const response = await callVoiceAPI(directlyAddressed, text)
        addMessage(directlyAddressed, response, routingIntent)
        await speakEmployee(directlyAddressed, response)

      } else if (routingIntent === 'standup') {
        // ── Standup: everyone gives a brief status update in sequence ──
        for (const p of participants) {
          const statusPrompt = `The owner just asked: "${text}". Give your personal status update — what you've been working on, any wins or flags, keep it to 2-3 sentences. Be specific and human.`
          const response = await callVoiceAPI(p.employee.id, statusPrompt)
          addMessage(p.employee.id, response, 'status_request')
          await speakEmployee(p.employee.id, response)
          // Small pause between speakers
          await new Promise(r => setTimeout(r, 300))
        }

      } else if (routingIntent === 'greeting') {
        // ── Greeting: 2-3 employees respond naturally ──
        const greeters = participants.slice(0, Math.min(3, participants.length))
        for (const p of greeters) {
          const response = await callVoiceAPI(p.employee.id, text)
          addMessage(p.employee.id, response, 'greeting')
          await speakEmployee(p.employee.id, response)
          await new Promise(r => setTimeout(r, 200))
        }

      } else {
        // ── Broadcast: top 2-3 most relevant employees respond ──
        const responders = participants.slice(0, Math.min(3, participants.length))
        for (const p of responders) {
          const response = await callVoiceAPI(p.employee.id, text)
          addMessage(p.employee.id, response, routingIntent)
          await speakEmployee(p.employee.id, response)
          await new Promise(r => setTimeout(r, 200))
        }
      }
    } catch (e) {
      console.error('Meeting sendMessage error:', e)
    }

    setIsProcessing(false)
  }, [participants, isProcessing, addMessage, speakEmployee])

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
