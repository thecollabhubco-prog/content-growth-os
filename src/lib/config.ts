// Default workspace for local development (no auth mode)
// This matches the workspace inserted via seed SQL
export const DEV_WORKSPACE_ID = '393f7d35-cb6d-40a7-b901-7f0d00908f5b'

export function getWorkspaceHeader(): Record<string, string> {
  return { 'x-workspace-id': DEV_WORKSPACE_ID }
}
