import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace } from '@/types/database.types'

interface WorkspaceStore {
  currentWorkspaceId: string | null
  workspaces: Workspace[]
  setCurrentWorkspace: (id: string) => void
  setWorkspaces: (workspaces: Workspace[]) => void
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      currentWorkspaceId: null,
      workspaces: [],
      setCurrentWorkspace: (id) => set({ currentWorkspaceId: id }),
      setWorkspaces: (workspaces) => set({ workspaces }),
    }),
    { name: 'workspace-store' }
  )
)
