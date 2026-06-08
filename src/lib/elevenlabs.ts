/**
 * ElevenLabs TTS client
 * Each AI employee gets their own unique voice.
 * Falls back to browser SpeechSynthesis if no API key is set.
 */

// ElevenLabs voice IDs (premade voices)
export const EMPLOYEE_VOICE_IDS: Record<string, string> = {
  'alex-morgan':   'TxGEqnHWrfWFTfGW9XjX', // Josh — deep, analytical
  'james-harper':  'pNInz6obpgDQGcFmaJgB', // Adam — narrator, thoughtful
  'sophia-chen':   '21m00Tcm4TlvDq8ikWAM', // Rachel — professional, conversational
  'ryan-blake':    'yoZ06aMxZJJ28mfd3POQ', // Sam — raspy, direct
  'maya-patel':    'EXAVITQu4vr4xnSDxMaL', // Bella — soft, creative
  'ethan-cole':    'VR6AewLTigWG4xSOukaG', // Arnold — crisp, engaging
  'olivia-rhodes': 'MF3mGyEYCl7XYWbV9V6O', // Elli — warm, friendly
  'noah-bennett':  'ErXwobaYiN019PkySvjV', // Antoni — professional, calm
  'zara-kim':      'AZnzlk1XvdvUeBnXmlld', // Domi — strong, artistic
  'lucas-wright':  'TxGEqnHWrfWFTfGW9XjX', // Josh — reliable, direct
  'emma-davis':    '21m00Tcm4TlvDq8ikWAM', // Rachel — clear, analytical
  'kai-nakamura':  'VR6AewLTigWG4xSOukaG', // Arnold — energetic, sharp
  'grace-sterling':'MF3mGyEYCl7XYWbV9V6O', // Elli — warm, knowledgeable
  'liam-foster':   'ErXwobaYiN019PkySvjV', // Antoni — precise, editorial
  'ava-mitchell':  'EXAVITQu4vr4xnSDxMaL', // Bella — helpful, organized
}

// Browser voice pitch/rate per employee (for fallback)
export const EMPLOYEE_BROWSER_VOICE: Record<string, { pitch: number; rate: number; gender: 'male' | 'female' }> = {
  'alex-morgan':   { pitch: 0.85, rate: 0.95, gender: 'male' },
  'james-harper':  { pitch: 0.90, rate: 0.90, gender: 'male' },
  'sophia-chen':   { pitch: 1.10, rate: 1.00, gender: 'female' },
  'ryan-blake':    { pitch: 0.80, rate: 1.10, gender: 'male' },
  'maya-patel':    { pitch: 1.15, rate: 1.00, gender: 'female' },
  'ethan-cole':    { pitch: 0.95, rate: 1.05, gender: 'male' },
  'olivia-rhodes': { pitch: 1.05, rate: 0.95, gender: 'female' },
  'noah-bennett':  { pitch: 1.00, rate: 0.98, gender: 'male' },
  'zara-kim':      { pitch: 1.20, rate: 1.00, gender: 'female' },
  'lucas-wright':  { pitch: 0.88, rate: 1.02, gender: 'male' },
  'emma-davis':    { pitch: 1.08, rate: 1.00, gender: 'female' },
  'kai-nakamura':  { pitch: 0.92, rate: 1.08, gender: 'male' },
  'grace-sterling':{ pitch: 1.05, rate: 0.93, gender: 'female' },
  'liam-foster':   { pitch: 0.95, rate: 0.97, gender: 'male' },
  'ava-mitchell':  { pitch: 1.12, rate: 1.02, gender: 'female' },
}

let currentAudio: HTMLAudioElement | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

export async function speakAsEmployee(
  employeeId: string,
  text: string,
  apiKey?: string
): Promise<void> {
  // Stop any currently playing audio
  stopSpeaking()

  // Trim text for voice — strip markdown, cut very long responses
  const cleaned = cleanTextForVoice(text)

  if (apiKey) {
    try {
      await speakWithElevenLabs(employeeId, cleaned, apiKey)
      return
    } catch (e) {
      console.warn('ElevenLabs failed, falling back to browser TTS:', e)
    }
  }

  speakWithBrowser(employeeId, cleaned)
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
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  })

  if (!res.ok) throw new Error(`ElevenLabs error: ${res.status}`)

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  currentAudio = new Audio(url)

  return new Promise((resolve, reject) => {
    currentAudio!.onended = () => { URL.revokeObjectURL(url); resolve() }
    currentAudio!.onerror = reject
    currentAudio!.play()
  })
}

function speakWithBrowser(employeeId: string, text: string): void {
  if (!window.speechSynthesis) return

  const config = EMPLOYEE_BROWSER_VOICE[employeeId] || { pitch: 1, rate: 1, gender: 'male' }
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.pitch = config.pitch
  utterance.rate = config.rate
  utterance.volume = 1

  // Try to pick a matching voice
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    config.gender === 'female'
      ? v.name.toLowerCase().includes('female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Karen')
      : v.name.toLowerCase().includes('male') || v.name.includes('Daniel') || v.name.includes('Alex')
  )
  if (preferred) utterance.voice = preferred

  currentUtterance = utterance
  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (window.speechSynthesis) {
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
    .replace(/\*\*(.*?)\*\*/g, '$1')      // bold
    .replace(/\*(.*?)\*/g, '$1')           // italic
    .replace(/`{1,3}[^`]*`{1,3}/g, '')    // code
    .replace(/#{1,6} /g, '')              // headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/---+/g, '. ')              // hr
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 1200)                   // max ~2 min of speech
}
