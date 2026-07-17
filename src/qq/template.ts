import type { Config } from '../config'
import type { OnlineStatusResult } from '../types'
import type { ImageDimensions } from './types'

export function formatQQOnlineMarkdown(
  result: OnlineStatusResult,
  config: Config,
  imageUrl: string,
  dimensions: ImageDimensions,
): string {
  const lines = [
    `# ${escapeMarkdown(config.serverLabel)} 服务器状态`,
    '',
    `![服务器状态 #${dimensions.width}px #${dimensions.height}px](${imageUrl})`,
    '',
  ]

  if (!result.online || !result.overview) {
    lines.push('## 🔴 服务器离线', '', `> ${escapeMarkdown(result.error || '无法连接服务器')}`)
    return lines.join('\n')
  }

  const players = result.overview.players
  lines.push(`## 在线玩家 ${players.online} / ${players.max}`, '')
  if (!players.names.length) {
    lines.push('当前没有玩家在线')
    return lines.join('\n')
  }

  const limit = Math.max(1, Math.floor(config.qqMarkdownMaxPlayers || 50))
  for (const name of players.names.slice(0, limit)) {
    lines.push(`- ${escapeMarkdown(name)}`)
  }
  if (players.names.length > limit) {
    lines.push(`- 还有 ${players.names.length - limit} 名玩家未显示`)
  }
  return lines.join('\n')
}

export function formatPlainPlayerList(result: OnlineStatusResult, config: Config): string {
  if (!result.online || !result.overview) return `${config.serverLabel} 无法获取在线玩家列表`
  const { online, max, names } = result.overview.players
  if (!names.length) return `${config.serverLabel} 在线玩家 ${online} / ${max}\n当前没有玩家在线`
  return `${config.serverLabel} 在线玩家 ${online} / ${max}\n${names.join('、')}`
}

export function formatQQRenderedMarkdown(
  title: string,
  imageUrl: string,
  dimensions: ImageDimensions,
  body = '',
): string {
  const lines = [
    `# ${escapeMarkdown(title)}`,
    '',
    `![${escapeMarkdown(title)} #${dimensions.width}px #${dimensions.height}px](${imageUrl})`,
  ]
  if (body.trim()) lines.push('', body.trim())
  return lines.join('\n')
}

export function escapeMarkdown(value: string): string {
  return String(value).replace(/([\\`*_[\]~()>#+\-.!|])/g, '\\$1')
}
