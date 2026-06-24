'use client'

import { useState } from 'react'
import { useWorkspace } from '@/lib/workspace/context'

export default function WorkspaceSwitcher() {
  const { workspace, workspaces, activeProjectName, switchWorkspace } = useWorkspace()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative px-3 pb-2 pt-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-left group"
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
          style={{ backgroundColor: workspace.color }}
        >
          {workspace.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate text-[var(--foreground)]">{workspace.name}</p>
          {activeProjectName ? (
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">{activeProjectName}</p>
          ) : (
            <p className="text-[10px] text-[var(--muted-foreground)] truncate">{workspace.description}</p>
          )}
        </div>
        <span className="text-[var(--muted-foreground)] text-xs shrink-0 group-hover:text-[var(--foreground)]">⌄</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] px-3 pt-2 pb-1">
              Switch Business
            </p>
            {workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { switchWorkspace(ws.id); setOpen(false) }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors ${ws.id === workspace.id ? 'bg-[var(--muted)]' : ''}`}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                  style={{ backgroundColor: ws.color }}
                >
                  {ws.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[var(--foreground)] truncate">{ws.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] truncate">{ws.description}</p>
                </div>
                {ws.id === workspace.id && <span className="ml-auto text-[var(--primary)] text-xs">✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
