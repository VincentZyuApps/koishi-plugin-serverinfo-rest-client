import type { Context } from 'koishi'
import { ApiRequestError, type ApiClient } from '../api/client'
import type { PlayerStatsResponse } from '../api/types'
import type { Config } from '../config'
import { renderTypstTemplate } from '../index'
import { buildCommandKeyboard, escapeMarkdown, sendRenderedReply } from '../qq'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'

export function registerPlayerDataCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  const playerStatsCommand = primaryCommand(prefix, COMMAND_NAMES.playerData)
  const onlineCommand = primaryCommand(prefix, COMMAND_NAMES.online)
  ctx.command(
    `${playerStatsCommand} [playerName:text]`,
    commandDescription(COMMAND_NAMES.playerData, '查询自己或指定玩家的历史统计数据'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.playerData))
    .action(async ({ session }, rawPlayerName) => {
      const explicitPlayerName = String(rawPlayerName || '').trim()
      if (!explicitPlayerName && !config.adminToken) {
        return `尚未配置管理 API 令牌，无法查询当前账号绑定。\n你仍可使用：${playerStatsCommand} <玩家名>`
      }
      try {
        let data: PlayerStatsResponse
        if (explicitPlayerName) {
          data = await apiClient.get<PlayerStatsResponse>('/players/stats', { name: explicitPlayerName })
        } else {
          const selfId = session.selfId || session.bot?.selfId
          if (!selfId) return '无法识别当前 Bot 的 selfId，请检查适配器会话信息'
          data = await apiClient.post<PlayerStatsResponse>('/players/stats/bound', {
            platform: session.platform,
            selfId,
            userId: session.userId,
          }, true)
        }
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
            {
              label: '刷新数据',
              command: explicitPlayerName ? `${playerStatsCommand} ${data.name}` : playerStatsCommand,
              style: 1,
            },
            { label: '查看在线', command: onlineCommand },
          ]),
        }, logger)
      } catch (error) {
        if (!explicitPlayerName && error instanceof ApiRequestError) {
          if (error.code === 'binding_not_found') {
            const bindPlayerCommand = primaryCommand(prefix, COMMAND_NAMES.bindWhitelist)
            return `你还没有绑定 Xbox 玩家名。\n请先使用：${bindPlayerCommand} <玩家名>\n也可以使用：${playerStatsCommand} <玩家名> 查询指定玩家。`
          }
          if (error.code === 'bound_player_stats_not_found') {
            const playerName = getStringField(error.responseData, 'playerName') || '当前绑定玩家'
            return `你绑定的玩家 ${playerName} 暂无历史数据。\n该玩家至少需要进入服务器一次后才能产生统计记录。`
          }
        }
        logger.error(`查询玩家数据统计失败: ${error}`)
        return `查询玩家数据统计失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}

function getStringField(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return ''
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'string' ? field : ''
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
