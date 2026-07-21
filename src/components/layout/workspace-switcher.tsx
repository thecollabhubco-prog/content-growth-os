'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/lib/workspace/context'

const PLATFORM_ICONS: Record<string, string> = {
  wordpress: '🌐',
  linkedin: '💼',
  x: '𝕏',
  instagram: '📸',
  google: '📧',
  gmail: '📧',
  youtube: '▶️',
}

type ConnectionsMap = Record<string, string[]> // workspaceId -> platform list

export default function WorkspaceSwitcher() {
  const { workspace, workspaces, workspaceId, switchWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [connections, setConnections] = useState<ConnectionsMap>({})

  // Fetch connected platforms for real (non-virtual) workspaces. Virtual
  // aggregator workspaces (personal-brand) have no UUID row, so skip them.
  const loadConnections = useCallback(async () => {
    const real = workspaces.filter(w => !w.isPersonalBrand)
    const results = await Promise.allSettled(real.map(async w => {
      const res = await fetch('/api/v1/connections', { headers: { 'x-workspace-id': w.id } })
      const data = await res.json()
      const platforms: string[] = data.success
        ? Array.from(new Set((data.data as { platform: string; is_active: boolean }[])
            .filter(c => c.is_active)
            .map(c => c.platform === 'gmail' ? 'google' : c.platform)))
        : []
      return [w.id, platforms] as const
    }))
    const map: ConnectionsMap = {}
    for (const r of results) if (r.status === 'fulfilled') map[r.value[0]] = r.value[1]
    setConnections(map)
  }, [workspaces])

  useEffect(() => { loadConnections() }, [loadConnections])

  const activeConns = connections[workspaceId] || []

  return (
    <div className="relative px-2 py-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-100 border border-transparent"
        style={{ background: open ? 'var(--surface)' : 'transparent' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold text-white"
          style={{ background: workspace.color, boxShadow: `0 0 0 2px color-mix(in srgb, ${workspace.color} 30%, transparent)` }}
        >
          {workspace.initials.charAt(0)}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--foreground)' }}>
            {workspace.name}
          </p>
          <p className="text-[11px] truncate leading-tight mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            {workspace.isPersonalBrand
              ? 'Personal Brand'
              : activeConns.length
                ? activeConns.map(p => PLATFORM_ICONS[p] || '').join(' ')
                : 'No channels connected'}
          </p>
        </div>
        <span className={`text-[10px] shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--muted-foreground)', opacity: 0.6 }}>⌄</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute left-2 right-2 top-full mt-1 z-20 rounded-xl overflow-hidden py-1.5"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <p className="px-3 pt-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted-foreground)' }}>
              Switch Workspace
            </p>
            {workspaces.map(ws => {
              const isActive = ws.id === workspace.id
              const conns = connections[ws.id] || []
              return (
                <button
                  key={ws.id}
                  onClick={() => { switchWorkspace(ws.id); setOpen(false) }}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-100"
                  style={{ background: isActive ? 'var(--surface)' : 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[11px] font-bold text-white mt-0.5"
                    style={{ background: ws.color, opacity: isActive ? 1 : 0.75 }}
                  >
                    {ws.initials.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium truncate" style={{ color: isActive ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                        {ws.name}
                      </span>
                      {isActive && <span className="text-[11px] shrink-0" style={{ color: ws.color }}>✓</span>}
                    </div>
                    <p className="text-[10.5px] truncate mt-0.5" style={{ color: 'var(--muted-foreground)', opacity: 0.85 }}>
                      {ws.description}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--muted-foreground)' }}>
                      {ws.isPersonalBrand
                        ? 'Pulls context from all workspaces'
                        : conns.length
                          ? `${conns.map(p => PLATFORM_ICONS[p] || '').join(' ')} connected`
                          : 'No channels connected yet'}
                    </p>
                  </div>
                </button>
              )
            })}
            <div className="mx-3 my-1 h-px" style={{ background: 'var(--border)' }} />
            <p className="px-3 py-1.5 text-[10px]" style={{ color: 'var(--muted-foreground)', opacity: 0.7 }}>
              Connections, content and chat memory are separate per workspace.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
