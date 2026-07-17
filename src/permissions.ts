import type { Session } from 'koishi'

export interface PermissionEntry {
  platform: string
  channelId: string
  selfId: string
  userId: string
  enabled: boolean
}

function matchesScope(configured: string, actual: string | undefined): boolean {
  return !configured || configured === actual
}

export function hasPermission(session: Session, entries: PermissionEntry[]): boolean {
  const selfId = session.selfId || session.bot?.selfId
  return (entries || []).some((entry) =>
    entry.enabled
    && entry.userId === session.userId
    && matchesScope(entry.platform, session.platform)
    && matchesScope(entry.selfId, selfId)
    && matchesScope(entry.channelId, session.channelId)
  )
}
