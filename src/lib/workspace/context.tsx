'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { WORKSPACES, WorkspaceConfig, DEFAULT_WORKSPACE_ID, getWorkspace } from './workspaces'

interface WorkspaceContextValue {
  workspaceId: string
  workspace: WorkspaceConfig
  workspaces: WorkspaceConfig[]
  activeProjectId: string | null
  activeProjectName: string | null
  switchWorkspace: (id: string) => void
  setActiveProject: (id: string | null, name: string | null) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaceId: DEFAULT_WORKSPACE_ID,
  workspace: WORKSPACES[0],
  workspaces: WORKSPACES,
  activeProjectId: null,
  activeProjectName: null,
  switchWorkspace: () => {},
  setActiveProject: () => {},
})

const STORAGE_KEY = 'cgos_active_workspace'
const PROJECT_KEY = 'cgos_active_project'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID)
  const [activeProjectId, setProjectId] = useState<string | null>(null)
  const [activeProjectName, setProjectName] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && WORKSPACES.find(w => w.id === stored)) {
      setWorkspaceId(stored)
    }
    const proj = localStorage.getItem(PROJECT_KEY)
    if (proj) {
      try {
        const { id, name } = JSON.parse(proj)
        setProjectId(id)
        setProjectName(name)
      } catch { /* ignore */ }
    }
  }, [])

  const switchWorkspace = (id: string) => {
    setWorkspaceId(id)
    localStorage.setItem(STORAGE_KEY, id)
    // Clear project when switching workspace
    setProjectId(null)
    setProjectName(null)
    localStorage.removeItem(PROJECT_KEY)
  }

  const setActiveProject = (id: string | null, name: string | null) => {
    setProjectId(id)
    setProjectName(name)
    if (id) localStorage.setItem(PROJECT_KEY, JSON.stringify({ id, name }))
    else localStorage.removeItem(PROJECT_KEY)
  }

  return (
    <WorkspaceContext.Provider value={{
      workspaceId,
      workspace: getWorkspace(workspaceId),
      workspaces: WORKSPACES,
      activeProjectId,
      activeProjectName,
      switchWorkspace,
      setActiveProject,
    }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
