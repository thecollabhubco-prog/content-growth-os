'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWorkspace } from '@/lib/workspace/context'

type Platform = {
  id: string
  name: string
  icon: string
  description: string
  type: 'oauth' | 'credentials'
  oauthUrl?: string
  envVars?: string[]
  fields?: { name: string; label: string; type: string; placeholder: string }[]
}

const PLATFORMS: Platform[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    icon: '🌐',
    description: 'Publish blog articles directly to your WordPress site via Application Password',
    type: 'credentials',
    fields: [
      { name: 'siteUrl',             label: 'Site URL',            type: 'url',      placeholder: 'https://yoursite.com' },
      { name: 'username',            label: 'Username',            type: 'text',     placeholder: 'admin' },
      { name: 'applicationPassword', label: 'Application Password', type: 'password', placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx' },
    ],
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    description: 'Publish posts and carousels to your LinkedIn profile',
    type: 'oauth',
    oauthUrl: `/api/v1/connections/linkedin`,
    envVars: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'],
  },
  {
    id: 'x',
    name: 'X / Twitter',
    icon: '𝕏',
    description: 'Publish tweets and threads to X',
    type: 'oauth',
    oauthUrl: `/api/v1/connections/x`,
    envVars: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: '📸',
    description: 'Publish captions and images via Meta Business Suite',
    type: 'oauth',
    oauthUrl: `/api/v1/connections/instagram`,
    envVars: ['META_APP_ID', 'META_APP_SECRET'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    icon: '▶️',
    description: 'Upload and schedule videos via Google OAuth',
    type: 'oauth',
    oauthUrl: `/api/auth/google/init`,
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
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

const errorMessages: Record<string, string> = {
  linkedin_missing_client_id: 'LINKEDIN_CLIENT_ID env var is not set. Add it to .env.local or Vercel.',
  x_missing_client_id: 'X_CLIENT_ID env var is not set. Add it to .env.local or Vercel.',
  instagram_missing_app_id: 'META_APP_ID env var is not set. Add it to .env.local or Vercel.',
  google_missing_client_id: 'GOOGLE_CLIENT_ID env var is not set. Add it to .env.local or Vercel.',
  instagram_no_business_account: 'No Instagram Business Account found. Your Instagram must be a Business or Creator account linked to a Facebook Page.',
  instagram_no_pages: 'No Facebook Pages found. Instagram publishing requires a connected Facebook Page.',
  linkedin_denied: 'LinkedIn authorization was cancelled.',
  x_denied: 'X authorization was cancelled.',
  instagram_denied: 'Instagram authorization was cancelled.',
}

function PublishingContent() {
  const { workspaceId, workspace } = useWorkspace()
  const searchParams = useSearchParams()
  const successParam = searchParams.get('success')
  const errorParam = searchParams.get('error')
  const accountParam = searchParams.get('account')
  const emailParam = searchParams.get('email')

  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [connectingPlatform, setConnectingPlatform] = useState<Platform | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [n8nUrl, setN8nUrl] = useState('')
  const [n8nSaved, setN8nSaved] = useState(false)

  useEffect(() => {
    loadConnections()
    const saved = localStorage.getItem('n8n_webhook_url') || ''
    setN8nUrl(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId])

  async function loadConnections() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/connections', {
        headers: { 'x-workspace-id': workspaceId },
      })
      const data = await res.json()
      if (data.success) setConnections(data.data || [])
    } catch { /* ignore */ } finally { setLoading(false) }
  }

  async function saveCredentials(platform: Platform) {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-workspace-id': workspaceId },
        body: JSON.stringify({
          platform: platform.id,
          credentials,
          account_url: credentials.siteUrl,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setConnectingPlatform(null)
        setCredentials({})
        loadConnections()
      }
    } finally { setSaving(false) }
  }

  async function disconnect(platform: string) {
    if (!confirm(`Disconnect ${platform}?`)) return
    setDisconnecting(platform)
    try {
      await fetch(`/api/v1/connections?platform=${platform}`, {
        method: 'DELETE',
        headers: { 'x-workspace-id': workspaceId },
      })
      setConnections(prev => prev.filter(c => c.platform !== platform))
    } finally { setDisconnecting(null) }
  }

  function saveN8nUrl() {
    localStorage.setItem('n8n_webhook_url', n8nUrl.trim())
    setN8nSaved(true)
    setTimeout(() => setN8nSaved(false), 2000)
  }

  // YouTube rides on the same Google OAuth connection as Gmail/Calendar/Drive —
  // there's no separate 'youtube' row, so treat it as an alias for 'google'.
  const platformKey = (id: string) => (id === 'youtube' ? 'google' : id)
  const isConnected = (id: string) => connections.some(c => c.platform === platformKey(id) && c.is_active)
  const getConn = (id: string) => connections.find(c => c.platform === platformKey(id))

  const successMessage = successParam === 'google_connected'
    ? `Google Workspace connected: ${emailParam}`
    : successParam?.includes('_connected')
    ? `${accountParam || successParam.replace('_connected', '')} connected successfully`
    : null

  const errorMessage = errorParam ? (errorMessages[errorParam] || `Error: ${errorParam.replace(/_/g, ' ')}`) : null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Publishing Connections</h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Connect your channels. Once connected, your AI team publishes directly to these platforms.
        </p>
      </div>

      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          ✓ {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          ⚠️ {errorMessage}
        </div>
      )}

      {loading && (
        <div className="text-center text-sm text-[var(--muted-foreground)] py-2">Loading connections...</div>
      )}

      {/* Platform Cards */}
      <div className="space-y-3">
        {PLATFORMS.map(platform => {
          const connected = isConnected(platform.id)
          const conn = getConn(platform.id)
          const isExpanding = connectingPlatform?.id === platform.id

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
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          Connected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {conn?.account_name
                        ? conn.account_name
                        : conn?.account_url
                        ? conn.account_url
                        : platform.description
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <button
                      onClick={() => disconnect(platformKey(platform.id))}
                      disabled={disconnecting === platformKey(platform.id)}
                      className="text-xs border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      {disconnecting === platformKey(platform.id) ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setConnectingPlatform(isExpanding ? null : platform); setCredentials({}) }}
                      className="text-sm bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
                    >
                      {isExpanding ? 'Cancel' : 'Connect'}
                    </button>
                  )}
                </div>
              </div>

              {/* Credentials form (WordPress) */}
              {isExpanding && platform.type === 'credentials' && (
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
                    <button
                      onClick={() => saveCredentials(platform)}
                      disabled={saving}
                      className="flex-1 bg-[var(--primary)] text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {saving ? 'Connecting...' : 'Save connection'}
                    </button>
                    <button
                      onClick={() => { setConnectingPlatform(null); setCredentials({}) }}
                      className="px-4 py-2 border border-[var(--border)] rounded-lg text-sm hover:bg-[var(--muted)] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* OAuth flow */}
              {isExpanding && platform.type === 'oauth' && (
                <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-3">
                  {platform.envVars && (
                    <div className="bg-[var(--muted)] rounded-lg p-3 text-xs text-[var(--muted-foreground)]">
                      <p className="font-medium mb-1.5 text-[var(--foreground)]">Required environment variables:</p>
                      {platform.envVars.map(v => (
                        <code key={v} className="block mb-0.5">{v}</code>
                      ))}
                      <p className="mt-2">Add these to <code>.env.local</code> and Vercel project settings.</p>
                    </div>
                  )}
                  <button
                    onClick={() => { window.location.href = `${platform.oauthUrl}?workspace_id=${workspaceId}` }}
                    className="w-full bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition"
                  >
                    Authorize with {platform.name} →
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* Google Workspace — per-workspace account */}
        {(() => {
          const googleConn = connections.find(c => c.platform === 'google' && c.is_active)
          const justConnected = successParam === 'google_connected'
          const gConnected = !!googleConn || justConnected
          const connectedEmail = googleConn?.account_name || (justConnected ? emailParam : null)
          return (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📧</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Google Workspace</span>
                      {gConnected && (
                        <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Connected
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {connectedEmail
                        ? `${connectedEmail} · ${workspace.name}`
                        : `Gmail, Calendar, Drive, and Docs — for ${workspace.name}`
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {gConnected && (
                    <button
                      onClick={() => disconnect('google')}
                      disabled={disconnecting === 'google'}
                      className="text-xs border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition disabled:opacity-50"
                    >
                      {disconnecting === 'google' ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  )}
                  <button
                    onClick={() => { window.location.href = `/api/auth/google/init?workspace_id=${workspaceId}` }}
                    className="text-sm bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
                  >
                    {gConnected ? 'Reconnect' : 'Connect Google'}
                  </button>
                </div>
              </div>
              <div className="mt-3 bg-[var(--muted)] rounded-lg p-3 text-xs text-[var(--muted-foreground)]">
                Connecting attaches a Google account to the <strong>{workspace.name}</strong> workspace.
                Switch workspaces in the sidebar to connect a different account (e.g. one per brand).
              </div>
            </div>
          )
        })()}
      </div>

      {/* n8n Automation */}
      <div>
        <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-3">
          ⚙️ n8n Automation
        </h2>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Inbound Webhook (n8n → this app)</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">
              Configure this URL in n8n to trigger actions: publish scheduled content, store trend signals, create calendar entries.
            </p>
            <div className="bg-[var(--muted)] rounded-lg p-3">
              <code className="text-xs text-[var(--primary)] break-all">
                {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/webhooks/n8n
              </code>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Set header: <code>x-n8n-secret: ${'{'}{'{'}N8N_WEBHOOK_SECRET{'}'}{'}'}</code>
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium mb-1">Outbound Webhook (this app → n8n)</p>
            <p className="text-xs text-[var(--muted-foreground)] mb-2">
              Your n8n webhook URL to receive events when content is generated, published, or actions complete.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={n8nUrl}
                onChange={e => setN8nUrl(e.target.value)}
                placeholder="https://your-n8n.cloud/webhook/xxxxx"
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
              />
              <button
                onClick={saveN8nUrl}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition whitespace-nowrap"
              >
                {n8nSaved ? '✓ Saved' : 'Save URL'}
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Also set <code>N8N_WEBHOOK_URL</code> in Vercel for server-side triggers. Set <code>N8N_WEBHOOK_SECRET</code> for authentication.
            </p>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-sm font-medium mb-2">Supported n8n Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { action: 'publish_scheduled_content', desc: 'Publish all due scheduled items' },
                { action: 'store_trend_signals',       desc: 'Import trend data from your workflows' },
                { action: 'create_content',            desc: 'Create a content item from n8n' },
                { action: 'add_calendar_entry',        desc: 'Add entry to content calendar' },
                { action: 'log_automation_run',        desc: 'Log workflow execution to DB' },
              ].map(a => (
                <div key={a.action} className="bg-[var(--muted)] rounded-lg p-2.5">
                  <code className="text-xs text-[var(--primary)] block mb-0.5">{a.action}</code>
                  <span className="text-[10px] text-[var(--muted-foreground)]">{a.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PublishingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--muted-foreground)]">Loading...</div>}>
      <PublishingContent />
    </Suspense>
  )
}
