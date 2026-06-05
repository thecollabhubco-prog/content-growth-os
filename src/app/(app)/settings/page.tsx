'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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
  { key: 'GOOGLE_CLIENT_ID', label: 'Google Client ID', group: 'Google' },
  { key: 'GOOGLE_CLIENT_SECRET', label: 'Google Client Secret', group: 'Google' },
  { key: 'LINKEDIN_CLIENT_ID', label: 'LinkedIn Client ID', group: 'Publishing' },
  { key: 'X_CLIENT_ID', label: 'X Client ID', group: 'Publishing' },
  { key: 'ENCRYPTION_KEY', label: 'Encryption Key (32-byte hex)', group: 'Security' },
]

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
