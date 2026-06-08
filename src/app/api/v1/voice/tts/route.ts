import { NextRequest } from 'next/server'

// Voice ID map — same as client lib but available server-side
const VOICE_IDS: Record<string, string> = {
  'alex-morgan':    'TxGEqnHWrfWFTfGW9XjX', // Josh
  'james-harper':   'pNInz6obpgDQGcFmaJgB', // Adam
  'sophia-chen':    '21m00Tcm4TlvDq8ikWAM', // Rachel
  'ryan-blake':     'yoZ06aMxZJJ28mfd3POQ', // Sam
  'maya-patel':     'EXAVITQu4vr4xnSDxMaL', // Bella
  'ethan-cole':     'VR6AewLTigWG4xSOukaG', // Arnold
  'olivia-rhodes':  'MF3mGyEYCl7XYWbV9V6O', // Elli
  'noah-bennett':   'ErXwobaYiN019PkySvjV', // Antoni
  'zara-kim':       'AZnzlk1XvdvUeBnXmlld', // Domi
  'lucas-wright':   'TxGEqnHWrfWFTfGW9XjX', // Josh
  'emma-davis':     '21m00Tcm4TlvDq8ikWAM', // Rachel
  'kai-nakamura':   'VR6AewLTigWG4xSOukaG', // Arnold
  'grace-sterling': 'MF3mGyEYCl7XYWbV9V6O', // Elli
  'liam-foster':    'ErXwobaYiN019PkySvjV', // Antoni
  'ava-mitchell':   'EXAVITQu4vr4xnSDxMaL', // Bella
}

export async function POST(request: NextRequest) {
  try {
    const { employee_id, text } = await request.json()

    if (!text || !employee_id) {
      return new Response(JSON.stringify({ error: 'Missing employee_id or text' }), { status: 400 })
    }

    // Try server-side key first, then fall back to header
    const apiKey = process.env.ELEVENLABS_API_KEY ||
      request.headers.get('x-elevenlabs-key') ||
      null

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'No ElevenLabs API key configured' }), { status: 503 })
    }

    const voiceId = VOICE_IDS[employee_id] || 'pNInz6obpgDQGcFmaJgB'

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.substring(0, 1200),
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.80,
          style: 0.35,
          use_speaker_boost: true,
        },
      }),
    })

    if (!elevenRes.ok) {
      const err = await elevenRes.text()
      console.error('ElevenLabs TTS error:', elevenRes.status, err)
      return new Response(JSON.stringify({ error: `ElevenLabs error: ${elevenRes.status}` }), { status: elevenRes.status })
    }

    const audioBuffer = await elevenRes.arrayBuffer()

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('TTS route error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
