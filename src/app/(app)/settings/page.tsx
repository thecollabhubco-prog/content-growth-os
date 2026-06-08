'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState, useEffect } from 'react'
import { EMPLOYEES } from '@/lib/employees'
import { EMPLOYEE_VOICE_IDS } from '@/lib/elevenlabs'

const sections = [
  {
    title: 'Workspace',
    items: [
      { label: 'General', desc: 'Name, slug, industry, description', icon: '🏢' },
      { label: 'AI Model Preferences', desc: 'Default models per task type', icon: '🤖' },
      { label: 'Writing Rules', desc: 'Custom AI writing rules for your brand', icon: '✍️' },
    ],
  },
  {
    title: 'Connections',
    items: [
      { label: 'Publishing Platforms', desc: 'WordPress, LinkedIn, X, Instagram, YouTube', icon: '🔌', href: '/publishing' },
      { label: 'Google Workspace', desc: 'Gmail, Calendar, Drive, Docs', icon: '📧' },
      { label: 'n8n Automation', desc: 'Webhook and workflow settings', icon: '⚙️' },
    ],
  },
  {
    title: 'Team',
    items: [
      { label: 'Members', desc: 'Invite and manage team members', icon: '👥' },
      { label: 'Roles & Permissions', desc: 'Owner, Admin, Editor, Viewer', icon: '🔐' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', desc: 'Name, avatar, timezone', icon: '👤' },
      { label: 'Notifications', desc: 'Email and in-app notification preferences', icon: '🔔' },
      { label: 'API Keys', desc: 'Manage API access keys', icon: '🔑' },
      { label: 'Billing', desc: 'Plan, usage, and invoices', icon: '💳' },
    ],
  },
]

const envVars = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', group: 'Database' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', group: 'Database' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', group: 'Database' },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', group: 'AI' },
  { key: 'TAVILY_API_KEY', label: 'Tavily API Key', group: 'Research' },
  { key: 'FIRECRAWL_API_KEY', label: 'Firecrawl API Key', group: 'Research' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI API Key', group: 'Images' },
  { key: 'ELEVENLABS_API_KEY', label: 'ElevenLabs API Key (optional — stored client-side)', group: 'Voice' },
  { key: 'GOOGLE_CLIENT_ID', label: 'Google Client ID', group: 'Google' },
  { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret', group: 'Google' },
  { key: 'LINKEDIN_CLIENT_ID', label: 'LinkedIn Client ID', group: 'Publishing' },
  { key: 'X_CLIENT_ID', label: 'X Client ID', group: 'Publishing' },
  { key: 'ENCRYPTION_KEY', label: 'Encryption Key (32-byte hex)', group: 'Security' },
]

// Voice name labels for each ElevenLabs voice ID
const VOICE_LABELS: Record<string, string> = {
  'TxGEqnHWrfWFTfGW9XjX': 'Josh',
  'pNInz6obpgDQGcFmaJgB': 'Adam',
  '21m00Tcm4TlvDq8ikWAM': 'Rachel',
  'yoZ06aMxZJJ28mfd3POQ': 'Sam',
  'EXAVITQu4vr4xnSDxMaL': 'Bella',
  'VR6AewLTigWG4xSOukaG': 'Arnold',
  'MF3mGyEYCl7XYWbV9V6O': 'Elli',
  'ErXwobaYiN019PkySvjV': 'Antoni',
  'AZnzlk1XvdvUeBnXmlld': 'Domi',
}

function ElevenLabsSettings() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [hasKey, setHasKey] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('elevenlabs_api_key') || ''
    setHasKey(!!stored)
    // Show masked version
    if (stored) setApiKey(stored)
  }, [])

  function saveKey() {
    const trimmed = apiKey.trim()
    if (!trimmed) {
      localStorage.removeItem('elevenlabs_api_key')
      setHasKey(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return
    }
    localStorage.setItem('elevenlabs_api_key', trimmed)
    setHasKey(true)
    setSaved(true)
    setTestResult(null)
    setTimeout(() => setSaved(false), 2000)
  }

  async function testConnection() {
    const key = localStorage.getItem('elevenlabs_api_key')
    if (!key) {
      setTestResult({ ok: false, message: 'No API key saved. Enter and save your key first.' })
      return
    }
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': key },
      })
      if (res.ok) {
        const data = await res.json()
        const remaining = data.subscription?.character_limit - data.subscription?.character_count
        setTestResult({
          ok: true,
          message: `Connected ✓  ·  ${remaining?.toLocaleString() ?? '?'} characters remaining this month`,
        })
      } else {
        setTestResult({ ok: false, message: `Invalid API key (${res.status}). Check it and try again.` })
      }
    } catch {
      setTestResult({ ok: false, message: 'Could not reach ElevenLabs. Check your internet connection.' })
    } finally {
      setTesting(false)
    }
  }

  async function previewVoice(employeeId: string) {
    const key = localStorage.getItem('elevenlabs_api_key')
    if (!key) {
      alert('Save your ElevenLabs API key first.')
      return
    }
    const voiceId = EMPLOYEE_VOICE_IDS[employeeId]
    const emp = EMPLOYEES.find(e => e.id === employeeId)
    const name = emp?.defaultName.split(' ')[0] || 'Hello'
    const text = `Hi, I'm ${emp?.defaultName}, your ${emp?.role}. Ready to get to work.`

    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      })
      if (!res.ok) { alert('Could not preview voice. Check your API key.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play()
    } catch {
      alert('Voice preview failed.')
    }
  }

  return (
    <div>
      <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
        🎙️ Voice — ElevenLabs
      </h2>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">ElevenLabs API Key</span>
                {hasKey && (
                  <span className="text-[10px] bg-green-500/15 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                    ● Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Each AI employee gets a unique realistic human voice. Without this key, browser voices are used.{' '}
                <a
                  href="https://elevenlabs.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline"
                >
                  Get a free key at elevenlabs.io →
                </a>
              </p>
            </div>
          </div>

          {/* Key input */}
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk_..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/40 pr-10 font-mono"
                autoComplete="off"
              />
              <button
                onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs"
              >
                {showKey ? '🙈' : '👁️'}
              </button>
            </div>
            <button
              onClick={saveKey}
              className="px-5 py-2.5 bg-[var(--primary)] text-white text-sm font-medium rounded-lg hover:bg-[var(--primary)]/90 transition-colors whitespace-nowrap"
            >
              {saved ? '✓ Saved' : 'Save Key'}
            </button>
            <button
              onClick={testConnection}
              disabled={testing || !hasKey}
              className="px-4 py-2.5 border border-[var(--border)] text-sm rounded-lg hover:bg-[var(--muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {testing ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border border-[var(--muted-foreground)] border-t-[var(--foreground)] rounded-full animate-spin inline-block" />
                  Testing...
                </span>
              ) : 'Test Connection'}
            </button>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`text-xs px-3 py-2 rounded-lg ${testResult.ok ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {testResult.message}
            </div>
          )}

          {!hasKey && (
            <p className="text-xs text-[var(--muted-foreground)] mt-2 flex items-center gap-1.5">
              <span>ℹ️</span>
              Free tier: ~10,000 characters/month. Enough for hundreds of voice responses.
            </p>
          )}
        </div>

        {/* Voice roster */}
        <div className="p-5">
          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide mb-4">
            Employee Voice Assignments
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EMPLOYEES.map(emp => {
              const voiceId = EMPLOYEE_VOICE_IDS[emp.id]
              const voiceName = VOICE_LABELS[voiceId] || 'Custom'
              return (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--muted)]/40 hover:bg-[var(--muted)]/70 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${emp.bgColor}`}>
                    {emp.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{emp.defaultName}</div>
                    <div className="text-[10px] text-[var(--muted-foreground)] truncate">{emp.role}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 rounded-full font-medium">
                      {voiceName}
                    </span>
                    {hasKey && (
                      <button
                        onClick={() => previewVoice(emp.id)}
                        title="Preview this voice"
                        className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] rounded px-1.5 py-0.5 hover:bg-[var(--muted)] transition-colors"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!hasKey && (
            <p className="text-xs text-[var(--muted-foreground)] mt-4 text-center">
              Save your ElevenLabs API key above to preview each employee's voice
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">Workspace configuration and integrations</p>
      </div>

      {success === 'google_connected' && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg">
          Google Workspace connected: {searchParams.get('email')}
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          Error: {error.replace(/_/g, ' ')}
        </div>
      )}

      {/* Settings Sections */}
      {sections.map(section => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
            {section.title}
          </h2>
          <div className="space-y-2">
            {section.items.map(item => (
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)] transition-colors"
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{item.desc}</div>
                  </div>
                  <span className="text-[var(--muted-foreground)] text-sm">→</span>
                </Link>
              ) : (
                <div
                  key={item.label}
                  className="flex items-center gap-3 bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">{item.desc}</div>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded">
                    Coming soon
                  </span>
                </div>
              )
            ))}
          </div>
        </div>
      ))}

      {/* ElevenLabs Voice Settings */}
      <ElevenLabsSettings />

      {/* Environment Variables Reference */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
          Required Environment Variables
        </h2>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <p className="text-xs text-[var(--muted-foreground)]">
              Configure these in your <code className="bg-[var(--muted)] px-1.5 py-0.5 rounded text-[var(--foreground)]">.env.local</code> file.
              Never commit real API keys to version control.
            </p>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Object.entries(
              envVars.reduce((acc, v) => {
                if (!acc[v.group]) acc[v.group] = []
                acc[v.group].push(v)
                return acc
              }, {} as Record<string, typeof envVars>)
            ).map(([group, vars]) => (
              <div key={group}>
                <div className="px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] bg-[var(--muted)]/30">
                  {group}
                </div>
                {vars.map(v => (
                  <div key={v.key} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-[var(--muted-foreground)]">{v.label}</span>
                    <code className="text-[10px] bg-[var(--muted)] px-2 py-0.5 rounded text-[var(--foreground)]">
                      {v.key}
                    </code>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database Setup */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
          Database Setup
        </h2>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <p className="text-sm font-medium mb-2">Run the database schema in Supabase</p>
          <p className="text-xs text-[var(--muted-foreground)] mb-3">
            Execute the <code className="bg-[var(--muted)] px-1 rounded">DATABASE_SCHEMA.sql</code> file in your Supabase SQL Editor.
            Enable the <code className="bg-[var(--muted)] px-1 rounded">pgvector</code> extension first.
          </p>
          <ol className="text-xs text-[var(--muted-foreground)] space-y-1.5 list-decimal list-inside">
            <li>Go to Supabase Dashboard → SQL Editor</li>
            <li>Run: <code className="bg-[var(--muted)] px-1 rounded">CREATE EXTENSION IF NOT EXISTS vector;</code></li>
            <li>Run the full DATABASE_SCHEMA.sql file from your project root</li>
            <li>Verify all tables are created in Table Editor</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--muted-foreground)]">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
