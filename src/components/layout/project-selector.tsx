'use client'

import { useState, useEffect } from 'react'
import { useWorkspace } from '@/lib/workspace/context'

interface Project {
  id: string
  name: string
  type: string
  createdAt: string
}

const PROJECT_TYPES = [
  { value: 'awareness',         label: 'Awareness' },
  { value: 'promotional',       label: 'Promotional' },
  { value: 'thought_leadership', label: 'Thought Leadership' },
  { value: 'launch',            label: 'Product Launch' },
  { value: 'nurture',           label: 'Nurture' },
  { value: 'personal',          label: 'Personal Brand' },
]

function getKey(workspaceId: string) { return `cgos_projects_${workspaceId}` }
function load(workspaceId: string): Project[] {
  try { return JSON.parse(localStorage.getItem(getKey(workspaceId)) || '[]') } catch { return [] }
}
function save(workspaceId: string, projects: Project[]) {
  localStorage.setItem(getKey(workspaceId), JSON.stringify(projects))
}

export default function ProjectSelector() {
  const { workspaceId, activeProjectId, activeProjectName, setActiveProject } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('awareness')

  useEffect(() => { setProjects(load(workspaceId)) }, [workspaceId])

  const create = () => {
    if (!newName.trim()) return
    const p: Project = { id: `proj_${Date.now()}`, name: newName.trim(), type: newType, createdAt: new Date().toISOString() }
    const updated = [...projects, p]
    setProjects(updated); save(workspaceId, updated)
    setActiveProject(p.id, p.name)
    setNewName(''); setCreating(false); setOpen(false)
  }

  const del = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated); save(workspaceId, updated)
    if (activeProjectId === id) setActiveProject(null, null)
  }

  return (
    <div className="relative px-2 py-1.5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors duration-100"
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <span className="text-sm shrink-0">📁</span>
        <span
          className="text-[12px] flex-1 truncate text-left"
          style={{ color: activeProjectId ? 'var(--foreground)' : 'var(--muted-foreground)' }}
        >
          {activeProjectName || 'All Projects'}
        </span>
        <span className="text-[10px] shrink-0" style={{ color: 'var(--muted-foreground)', opacity: 0.4 }}>⌄</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreating(false) }} />
          <div
            className="absolute left-2 right-2 top-full mt-1 z-20 rounded-xl overflow-hidden py-1"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            }}
          >
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted-foreground)' }}>
              Campaign
            </p>

            {/* All */}
            <button
              onClick={() => { setActiveProject(null, null); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-100"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span className="text-sm">📂</span>
              <span className="text-[13px] flex-1" style={{ color: !activeProjectId ? 'var(--foreground)' : 'var(--muted-foreground)' }}>All Projects</span>
              {!activeProjectId && <span className="text-[11px]" style={{ color: 'var(--primary)' }}>✓</span>}
            </button>

            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => { setActiveProject(p.id, p.name); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-100 group"
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span className="text-sm">📁</span>
                <span className="text-[13px] flex-1 truncate" style={{ color: activeProjectId === p.id ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{p.name}</span>
                <span className="opacity-0 group-hover:opacity-100 text-[11px] transition-opacity cursor-pointer" onClick={e => del(p.id, e)} style={{ color: 'var(--muted-foreground)' }}>✕</span>
                {activeProjectId === p.id && <span className="text-[11px]" style={{ color: 'var(--primary)' }}>✓</span>}
              </button>
            ))}

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4 }}>
              {creating ? (
                <div className="px-3 py-2.5">
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }}
                    placeholder="Campaign name..."
                    className="w-full rounded-lg px-3 py-1.5 text-[13px] mb-2 focus:outline-none"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  />
                  <div className="grid grid-cols-2 gap-1 mb-2.5">
                    {PROJECT_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setNewType(t.value)}
                        className="text-left px-2 py-1 rounded-md text-[11px] transition-colors"
                        style={newType === t.value
                          ? { background: 'var(--primary-subtle)', color: 'var(--primary)', border: '1px solid var(--primary-border)' }
                          : { background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid transparent' }
                        }
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={create}
                      disabled={!newName.trim()}
                      className="flex-1 text-white text-[12px] py-1.5 rounded-lg transition-opacity disabled:opacity-40"
                      style={{ background: 'var(--primary)' }}
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setCreating(false)}
                      className="px-3 text-[12px] py-1.5 rounded-lg"
                      style={{ background: 'var(--muted)', color: 'var(--muted-foreground)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100"
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span className="text-sm">＋</span>
                  <span className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>New Campaign</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
