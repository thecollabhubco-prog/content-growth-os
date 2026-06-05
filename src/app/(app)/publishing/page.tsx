'use client'

import { useState, useEffect } from 'react'

type Platform = {
  id: string
  name: string
  icon: string
  description: string
  type: 'oauth' | 'credentials'
  fields?: { name: string; label: string; type: string; placeholder: string }[]
}

const PLATFORMS: Platform[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: '🌐',
    description: 'Publish blog articles directly to your WordPress site',
    type: 'credentials',
    fields: [
      { name: 'siteUrl', label: 'Site URL', type: 'url', placeholder: 'https://yoursite.com' },
      { name: 'username', label: 'Username', type: 'text', placeholder: 'admin' },
      { name: 'applicationPassword', label: 'Application Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx' },
    ],
  },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼', description: 'Publish posts and carousels to your LinkedIn profile', type: 'oauth' },
  { id: 'x', name: 'X / Twitter', icon: '𝕏', description: 'Publish tweets and threads to X', type: 'oauth' },
  { id: 'instagram', name: 'Instagram', icon: '📸', description: 'Publish captions and carousels to Instagram', type: 'oauth' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', description: 'Upload and schedule videos to YouTube', type: 'oauth' },
]

type Connection = {
  id: string
  platform: string
  account_name: string | null
  account_url: string | null
  is_active: boolean
  last_sync_at: string | null
  created_at: string
}

export default function PublishingPage() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => { loadConnections() }, [])

  async function loadConnections() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/connections', { headers: { 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' } })
      const data = await res.json()
      if (data.success) setConnections(data.data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function saveCredentials(platform: Platform) {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': '393f7d35-cb6d-40a7-b901-7f0d00908f5b' },
        body: JSON.stringify({ platform: platform.id, credentials, account_url: credentials.siteUrl }),
      })
      const data = await res.json()
      if (data.success) {
        setMessage({ type: 'success', text: `${platform.name} connected` })
        setConnectingPlatform(null)
        setCredentials({})
        loadConnections()
      } else {
        setMessage({ type: 'error', text: data.error?.message || 'Connection failed' })
      }
    } finally { setSaving(false) }
  }

  const isConnected = (id: string) => connections.some(c => c.platform === id && c.is_active)
  const getConn = (id: string) => connections.find(c => c.platform === id && c.is_active)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Publishing Connections</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Connect your channels. Content Growth OS publishes directly to these platforms.
        </p>
      </div>

      {message && (
        <div className={`text-sm px-4 py-3 rounded-lg border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-3">
        {PLATFORMS.map(platform => {
          const connected = isConnected(platform.id)
          const conn = getConn(platform.id)

          return (
            <div key={platform.id} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{platform.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{platform.name}</span>
                      {connected && (
                        <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />Connected
                        </span>
                      )}
                    </div>
                    {conn?.account_url
                      ? <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{conn.account_url}</div>
                      : <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{platform.description}</div>
                    }
                  </div>
                </div>
                {!connected && (
                  <button
                    onClick={() => { setConnectingPlatform(platform); setMessage(null) }}
                    className="text-sm bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
                  >
                    Connect
                  </button>
                )}
              </div>

              {connectingPlatform?.id === platform.id && platform.type === 'credentials' && (
                <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-3">
                  {platform.fields?.map(field => (
                    <div key={field.name}>
                      <label className="block text-xs font-medium mb-1 text-[var(--muted-foreground)]">{field.label}</label>
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={credentials[field.name] || ''}
                        onChange={e => setCredentials(prev => ({ ...prev, [field.name]: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveCredentials(platform)} disabled={saving}
                      className="flex-1 bg-[var(--primary)] text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                      {saving ? 'Connecting...' : 'Save connection'}
                    </button>
                    <button onClick={() => { setConnectingPlatform(null); setCredentials({}) }}
                      className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {connectingPlatform?.id === platform.id && platform.type === 'oauth' && (
                <div className="mt-5 pt-5 border-t border-[var(--border)]">
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">
                    OAuth requires setting up your app credentials in environment variables first.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => { window.location.href = `/api/v1/connections/${platform.id}/oauth` }}
                      className="flex-1 bg-[var(--primary)] text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition">
                      Authorize with {platform.name}
                    </button>
                    <button onClick={() => setConnectingPlatform(null)}
                      className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Google Workspace */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <div className="font-medium text-sm">Google Workspace</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">Gmail, Calendar, Drive, and Docs</div>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/api/auth/google/init'}
              className="text-sm bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition">
              Connect Google
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-4">Loading connections...</div>
      )}
    </div>
  )
}
