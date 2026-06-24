export interface WorkspaceConfig {
  id: string
  name: string
  slug: string
  initials: string
  color: string
  description: string
  isPersonalBrand?: boolean
  sourceWorkspaceIds?: string[] // for personal brand — pulls context from these
}

export const WORKSPACES: WorkspaceConfig[] = [
  {
    id: '393f7d35-cb6d-40a7-b901-7f0d00908f5b',
    name: 'The Scaling Advisor',
    slug: 'tsa',
    initials: 'TSA',
    color: '#6366f1',
    description: 'B2B consulting & scaling strategy',
  },
  {
    id: 'b2f4e8c1-3d5a-4f7b-9e2c-1a8d6f0e3b5c',
    name: 'CollabHub',
    slug: 'collabhub',
    initials: 'CH',
    color: '#10b981',
    description: 'Collaboration platform for teams',
  },
  {
    id: 'personal-brand',
    name: 'Personal Brand',
    slug: 'personal',
    initials: 'AA',
    color: '#f59e0b',
    description: 'Aamish Aaftab — LinkedIn & thought leadership',
    isPersonalBrand: true,
    sourceWorkspaceIds: [
      '393f7d35-cb6d-40a7-b901-7f0d00908f5b',
      'b2f4e8c1-3d5a-4f7b-9e2c-1a8d6f0e3b5c',
    ],
  },
]

export const DEFAULT_WORKSPACE_ID = WORKSPACES[0].id

export function getWorkspace(id: string): WorkspaceConfig {
  return WORKSPACES.find(w => w.id === id) ?? WORKSPACES[0]
}
