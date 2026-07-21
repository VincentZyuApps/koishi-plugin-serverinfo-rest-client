import type { Context } from 'koishi'
import type { ApiClient } from '../api/client'
import type { PlayerStatsResponse } from '../api/types'
import type { Config } from '../config'
import { renderTypstTemplate } from '../index'
import { buildCommandKeyboard, escapeMarkdown, sendRenderedReply } from '../qq'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './names'

export function registerPlayerDataCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  ctx.command(
    `${primaryCommand(prefix, COMMAND_NAMES.playerData)} <playerName:text>`,
    commandDescription(COMMAND_NAMES.playerData, '查询历史玩家统计数据'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.playerData))
    .action(async ({ session }, rawPlayerName) => {
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请指定玩家名，例如：${prefix}.查询数据 Steve`
      try {
        const data = await apiClient.get<PlayerStatsResponse>('/players/stats', { name: playerName })
        const image = await renderTypstTemplate(ctx, config, logger, 'playerStats', {
          label: config.serverLabel,
          name: data.name,
          xuid: data.xuid,
          total_play: formatDuration(data.totalPlayMs),
          blocks_mined: formatInteger(data.blocksMined),
          mobs_killed: formatInteger(data.mobsKilled),
          join_count: formatInteger(data.joinCount),
          first_seen: formatDate(data.firstSeenMs),
          last_seen: formatDate(data.lastSeenMs),
        })
        return sendRenderedReply(ctx, session, config, {
          image,
          text: formatPlayerDataText(config, data),
          title: `${config.serverLabel} ${COMMAND_NAMES.playerData.emoji} 玩家数据`,
          markdownBody: formatPlayerDataMarkdown(data),
          keyboard: buildCommandKeyboard(config, [
            { label: '刷新数据', command: `${prefix}.查询数据 ${data.name}`, style: 1 },
            { label: '查看在线', command: `${prefix}.查在线` },
          ]),
        }, logger)
      } catch (error) {
        logger.error(`查询玩家数据失败: ${error}`)
        return `查询玩家数据失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}

function formatPlayerDataText(config: Config, data: PlayerStatsResponse): string {
  return `${config.serverLabel} ${COMMAND_NAMES.playerData.emoji} 玩家数据：${data.name}\n玩家 ID：${data.xuid}\n历史游玩时间：${formatDuration(data.totalPlayMs)}\n挖掘方块总数：${formatInteger(data.blocksMined)}\n击杀生物总数：${formatInteger(data.mobsKilled)}`
}

function formatPlayerDataMarkdown(data: PlayerStatsResponse): string {
  return [
    `## ${escapeMarkdown(data.name)}`,
    '',
    `- 玩家 ID：${escapeMarkdown(data.xuid)}`,
    `- 历史游玩：${escapeMarkdown(formatDuration(data.totalPlayMs))}`,
    `- 挖掘方块：${formatInteger(data.blocksMined)}`,
    `- 击杀生物：${formatInteger(data.mobsKilled)}`,
  ].join('\n')
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (days) return `${days}天 ${hours}小时 ${minutes}分钟`
  if (hours) return `${hours}小时 ${minutes}分钟`
  return `${minutes}分钟`
}

function formatDate(timestamp: number): string {
  return timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '未知'
}

function formatInteger(value: number): string {
  return Math.max(0, Number(value) || 0).toLocaleString('zh-CN')
}
