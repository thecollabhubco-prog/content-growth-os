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
  { value: 'awareness', label: 'Awareness', icon: '📢' },
  { value: 'promotional', label: 'Promotional', icon: '🚀' },
  { value: 'thought_leadership', label: 'Thought Leadership', icon: '💡' },
  { value: 'launch', label: 'Product Launch', icon: '🎯' },
  { value: 'nurture', label: 'Nurture / Education', icon: '📚' },
  { value: 'personal', label: 'Personal Brand', icon: '👤' },
]

function getStorageKey(workspaceId: string) {
  return `cgos_projects_${workspaceId}`
}

function loadProjects(workspaceId: string): Project[] {
  try {
    const stored = localStorage.getItem(getStorageKey(workspaceId))
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveProjects(workspaceId: string, projects: Project[]) {
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(projects))
}

export default function ProjectSelector() {
  const { workspaceId, activeProjectId, activeProjectName, setActiveProject } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('awareness')

  useEffect(() => {
    setProjects(loadProjects(workspaceId))
  }, [workspaceId])

  const createProject = () => {
    if (!newName.trim()) return
    const proj: Project = {
      id: `proj_${Date.now()}`,
      name: newName.trim(),
      type: newType,
      createdAt: new Date().toISOString(),
    }
    const updated = [...projects, proj]
    setProjects(updated)
    saveProjects(workspaceId, updated)
    setActiveProject(proj.id, proj.name)
    setNewName('')
    setCreating(false)
    setOpen(false)
  }

  const deleteProject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = projects.filter(p => p.id !== id)
    setProjects(updated)
    saveProjects(workspaceId, updated)
    if (activeProjectId === id) setActiveProject(null, null)
  }

  const typeInfo = (type: string) => PROJECT_TYPES.find(t => t.value === type) || PROJECT_TYPES[0]

  return (
    <div className="relative px-3 pb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--muted)] transition-colors text-left"
      >
        <span className="text-sm shrink-0">
          {activeProjectId ? typeInfo(projects.find(p => p.id === activeProjectId)?.type || '')?.icon : '📁'}
        </span>
        <span className="text-xs text-[var(--muted-foreground)] truncate flex-1">
          {activeProjectName || 'All Projects'}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">⌄</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setCreating(false) }} />
          <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg overflow-hidden">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted-foreground)] px-3 pt-2 pb-1">
              Campaign / Project
            </p>

            {/* All Projects option */}
            <button
              onClick={() => { setActiveProject(null, null); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors text-xs ${!activeProjectId ? 'bg-[var(--muted)]' : ''}`}
            >
              <span>📁</span>
              <span className="text-[var(--foreground)]">All Projects</span>
              {!activeProjectId && <span className="ml-auto text-[var(--primary)]">✓</span>}
            </button>

            {/* Existing projects */}
            {projects.map(proj => (
              <button
                key={proj.id}
                onClick={() => { setActiveProject(proj.id, proj.name); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors text-xs group ${activeProjectId === proj.id ? 'bg-[var(--muted)]' : ''}`}
              >
                <span>{typeInfo(proj.type).icon}</span>
                <span className="text-[var(--foreground)] flex-1 truncate">{proj.name}</span>
                <span className="text-[9px] text-[var(--muted-foreground)]">{typeInfo(proj.type).label}</span>
                {activeProjectId === proj.id && <span className="text-[var(--primary)] ml-1">✓</span>}
                <span
                  onClick={(e) => deleteProject(proj.id, e)}
                  className="ml-1 opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)] hover:text-red-400 transition-all cursor-pointer"
                >✕</span>
              </button>
            ))}

            {/* Create new */}
            {creating ? (
              <div className="px-3 py-2 border-t border-[var(--border)]">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createProject(); if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Project name..."
                  className="w-full bg-[var(--muted)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--primary)] mb-2"
                />
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {PROJECT_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setNewType(t.value)}
                      className={`text-left px-2 py-1 rounded text-[10px] transition-colors ${newType === t.value ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={createProject} disabled={!newName.trim()} className="flex-1 bg-[var(--primary)] text-white text-xs py-1 rounded disabled:opacity-50">Create</button>
                  <button onClick={() => setCreating(false)} className="flex-1 bg-[var(--muted)] text-xs py-1 rounded text-[var(--muted-foreground)]">Cancel</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors text-xs text-[var(--primary)] border-t border-[var(--border)]"
              >
                <span>+</span> New Project / Campaign
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
