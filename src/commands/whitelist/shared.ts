import { h, type Session } from 'koishi'
import type { Config } from '../../config'

export function parseTargetUserId(rawTargetUser: unknown): string {
  const source = String(rawTargetUser || '').trim()
  if (!source) return ''
  const mention = source.match(/^<at\b[^>]*\bid="([^"]+)"[^>]*\/?\s*>$/i)
  if (mention?.[1]) return mention[1].trim()
  return /^[^\s<>]+$/.test(source) ? source : ''
}

export function getSelfId(session: Session): string {
  return session.selfId || session.bot?.selfId || ''
}

export function requesterId(session: Session): string {
  return [session.platform, getSelfId(session), session.userId, session.channelId]
    .filter(Boolean)
    .join(':')
}

export function maskIdentifier(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function formatWarning(data: { warning?: string; commandOutput?: string }): string {
  if (!data.warning) return ''
  return `\n注意：${data.warning}${data.commandOutput ? `\n${data.commandOutput}` : ''}`
}

export function formatAllowlistResult(data: {
  allowlistSyncEnabled?: boolean
  warning?: string
  commandOutput?: string
}): string {
  const syncNotice = data.allowlistSyncEnabled === false
    ? '\n提示：BDS allowlist 同步已关闭，本次仅修改账号绑定'
    : ''
  return `${syncNotice}${formatWarning(data)}`
}

export function quoteIfNeeded(session: Session, config: Config, text: string) {
  if (config.quoteCommandReplies && session.messageId) {
    return h('', [h.quote(session.messageId), h.text(text)])
  }
  return text
}
