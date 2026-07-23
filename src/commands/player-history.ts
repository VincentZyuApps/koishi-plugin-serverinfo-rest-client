import type { PlayerHistoryResponse } from '../api/types'
import type { Config } from '../config'
import { renderTypstTemplate } from '../typst'
import { buildCommandKeyboard, escapeMarkdown, sendRenderedReply } from '../qq'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import type { CommandRegistrationContext } from './types'

export function registerPlayerHistoryCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const historyCommand = primaryCommand(prefix, COMMAND_NAMES.playerHistory)
  ctx.command(
    `${historyCommand} [page:number]`,
    commandDescription(COMMAND_NAMES.playerHistory, '查询历史玩家记录'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.playerHistory))
    .action(async ({ session }, requestedPage) => {
      const page = Math.max(1, Math.floor(Number(requestedPage) || 1))
      try {
        const data = await apiClient.get<PlayerHistoryResponse>('/players/history', {
          page: String(page),
          pageSize: String(config.historyPageSize),
        })
        const image = await renderTypstTemplate(ctx, config, logger, 'playerHistory', {
          label: config.serverLabel,
          total: data.total,
          page: data.page,
          page_count: data.pageCount,
          players: data.players.map((player, index) => ({
            number: (data.page - 1) * data.pageSize + index + 1,
            name: player.name,
            total_play: formatDuration(player.totalPlayMs),
            last_seen: formatDate(player.lastSeenMs),
          })),
        })
        const text = formatHistoryText(config, data)
        const buttons = []
        if (data.page > 1) {
          buttons.push({ label: '上一页', command: `${historyCommand} ${data.page - 1}` })
        }
        buttons.push({ label: '刷新', command: `${historyCommand} ${data.page}`, style: 1 })
        if (data.page < data.pageCount) {
          buttons.push({ label: '下一页', command: `${historyCommand} ${data.page + 1}` })
        }
        return sendRenderedReply(ctx, session, config, {
          image,
          text,
          title: `${config.serverLabel} ${COMMAND_NAMES.playerHistory.emoji} 历史玩家`,
          markdownBody: formatHistoryMarkdown(data),
          keyboard: buildCommandKeyboard(config, buttons),
        }, logger)
      } catch (error) {
        logger.error(`查询历史记录失败: ${error}`)
        return `查询历史记录失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}

function formatHistoryText(config: Config, data: PlayerHistoryResponse): string {
  const names = data.players.length
    ? data.players.map((player, index) => `${(data.page - 1) * data.pageSize + index + 1}. ${player.name}`).join('\n')
    : '暂无历史玩家'
  return `${config.serverLabel} ${COMMAND_NAMES.playerHistory.emoji} 历史玩家共 ${data.total} 人（第 ${data.page}/${data.pageCount} 页）\n${names}`
}

function formatHistoryMarkdown(data: PlayerHistoryResponse): string {
  const lines = [`共 **${data.total}** 名玩家，第 **${data.page} / ${data.pageCount}** 页`, '']
  for (const player of data.players) {
    lines.push(`- ${escapeMarkdown(player.name)} · ${escapeMarkdown(formatDuration(player.totalPlayMs))}`)
  }
  if (!data.players.length) lines.push('暂无历史玩家')
  return lines.join('\n')
}

function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days) return `${days}天 ${hours}小时`
  if (hours) return `${hours}小时 ${minutes}分钟`
  return `${minutes}分钟`
}

function formatDate(timestamp: number): string {
  if (!timestamp) return '未知'
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
