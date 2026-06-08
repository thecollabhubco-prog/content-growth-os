/**
 * ElevenLabs TTS client
 * Calls our server-side /api/v1/voice/tts proxy first (uses ELEVENLABS_API_KEY env var).
 * Falls back to direct ElevenLabs call if client key is in localStorage.
 * Final fallback: browser SpeechSynthesis.
 */

export const EMPLOYEE_VOICE_IDS: Record<string, string> = {
  'alex-morgan':    'TxGEqnHWrfWFTfGW9XjX',
  'james-harper':   'pNInz6obpgDQGcFmaJgB',
  'sophia-chen':    '21m00Tcm4TlvDq8ikWAM',
  'ryan-blake':     'yoZ06aMxZJJ28mfd3POQ',
  'maya-patel':     'EXAVITQu4vr4xnSDxMaL',
  'ethan-cole':     'VR6AewLTigWG4xSOukaG',
  'olivia-rhodes':  'MF3mGyEYCl7XYWbV9V6O',
  'noah-bennett':   'ErXwobaYiN019PkySvjV',
  'zara-kim':       'AZnzlk1XvdvUeBnXmlld',
  'lucas-wright':   'TxGEqnHWrfWFTfGW9XjX',
  'emma-davis':     '21m00Tcm4TlvDq8ikWAM',
  'kai-nakamura':   'VR6AewLTigWG4xSOukaG',
  'grace-sterling': 'MF3mGyEYCl7XYWbV9V6O',
  'liam-foster':    'ErXwobaYiN019PkySvjV',
  'ava-mitchell':   'EXAVITQu4vr4xnSDxMaL',
}

export const EMPLOYEE_BROWSER_VOICE: Record<string, { pitch: number; rate: number; gender: 'male' | 'female' }> = {
  'alex-morgan':    { pitch: 0.85, rate: 0.95, gender: 'male' },
  'james-harper':   { pitch: 0.90, rate: 0.90, gender: 'male' },
  'sophia-chen':    { pitch: 1.10, rate: 1.00, gender: 'female' },
  'ryan-blake':     { pitch: 0.80, rate: 1.10, gender: 'male' },
  'maya-patel':     { pitch: 1.15, rate: 1.00, gender: 'female' },
  'ethan-cole':     { pitch: 0.95, rate: 1.05, gender: 'male' },
  'olivia-rhodes':  { pitch: 1.05, rate: 0.95, gender: 'female' },
  'noah-bennett':   { pitch: 1.00, rate: 0.98, gender: 'male' },
  'zara-kim':       { pitch: 1.20, rate: 1.00, gender: 'female' },
  'lucas-wright':   { pitch: 0.88, rate: 1.02, gender: 'male' },
  'emma-davis':     { pitch: 1.08, rate: 1.00, gender: 'female' },
  'kai-nakamura':   { pitch: 0.92, rate: 1.08, gender: 'male' },
  'grace-sterling': { pitch: 1.05, rate: 0.93, gender: 'female' },
  'liam-foster':    { pitch: 0.95, rate: 0.97, gender: 'male' },
  'ava-mitchell':   { pitch: 1.12, rate: 1.02, gender: 'female' },
}

let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

export async function speakAsEmployee(
  employeeId: string,
  text: string,
  clientApiKey?: string
): Promise<void> {
  stopSpeaking()
  const cleaned = cleanTextForVoice(text)
  if (!cleaned) return

  // 1. Try server-side proxy (uses ELEVENLABS_API_KEY env var — no client key needed)
  try {
    await speakViaServer(employeeId, cleaned)
    return
  } catch (e) {
    console.warn('Server TTS failed, trying direct:', e)
  }

  // 2. Try direct ElevenLabs with client key (from localStorage)
  const apiKey = clientApiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('elevenlabs_api_key') || undefined : undefined)
  if (apiKey) {
    try {
      await speakWithElevenLabs(employeeId, cleaned, apiKey)
      return
    } catch (e) {
      console.warn('Direct ElevenLabs failed, falling back to browser TTS:', e)
    }
  }

  // 3. Browser speech synthesis fallback
  await speakWithBrowser(employeeId, cleaned)
}

async function speakViaServer(employeeId: string, text: string): Promise<void> {
  const res = await fetch('/api/v1/voice/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employee_id: employeeId, text }),
  })

  if (!res.ok) throw new Error(`Server TTS: ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  currentAudio = new Audio(url)

  return new Promise((resolve, reject) => {
    currentAudio!.onended = () => { URL.revokeObjectURL(url); resolve() }
    currentAudio!.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    currentAudio!.play().catch(reject)
  })
}

async function speakWithElevenLabs(employeeId: string, text: string, apiKey: string): Promise<void> {
  const voiceId = EMPLOYEE_VOICE_IDS[employeeId] || 'pNInz6obpgDQGcFmaJgB'

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2',
      voice_settings: { stability: 0.45, similarity_boost: 0.80, style: 0.35, use_speaker_boost: true },
    }),
  })

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  currentAudio = new Audio(url)

  return new Promise((resolve, reject) => {
    currentAudio!.onended = () => { URL.revokeObjectURL(url); resolve() }
    currentAudio!.onerror = reject
    currentAudio!.play().catch(reject)
  })
}

function speakWithBrowser(employeeId: string, text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return }

    const config = EMPLOYEE_BROWSER_VOICE[employeeId] || { pitch: 1, rate: 1, gender: 'male' }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.pitch = config.pitch
    utterance.rate = config.rate
    utterance.volume = 1

    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
      config.gender === 'female'
        ? v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen') || v.name.toLowerCase().includes('female')
        : v.name.includes('Daniel') || v.name.includes('Alex') || v.name.toLowerCase().includes('male')
    )
    if (preferred) utterance.voice = preferred

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel()
  }
  currentUtterance = null
}

export function isSpeaking(): boolean {
  return (currentAudio !== null && !currentAudio.paused) ||
    (typeof window !== 'undefined' && window.speechSynthesis?.speaking)
}

function cleanTextForVoice(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    .replace(/#{1,6} /g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/---+/g, '. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 1200)
}
