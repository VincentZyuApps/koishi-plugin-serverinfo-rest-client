import type { Context } from 'koishi'
import type { ApiClient } from '../api/client'
import type { PlayerStatsResponse } from '../api/types'
import type { Config } from '../config'
import { buildTypstTheme, escapeTypstText, getTypstRenderer } from '../index'
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
        const renderer = await getTypstRenderer(ctx, config, logger)
        const image = await renderer.toPng(generatePlayerDataTypst(config, data), config.typstRenderScale)
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

function generatePlayerDataTypst(config: Config, data: PlayerStatsResponse): string {
  const theme = buildTypstTheme(config)
  return `#set page(width: 520pt, height: auto, margin: 16pt, fill: ${theme.pageBg})
#set text(font: ("${escapeTypstText(theme.fontFamily)}", "Noto Color Emoji", "Noto Sans CJK SC", "Microsoft YaHei"), size: 11pt, fill: ${theme.textColor}, lang: "zh")
#block(fill: ${theme.headerFill}, stroke: 2pt + ${theme.headerStroke}, radius: 6pt, inset: 13pt, width: 100%)[
  #text(size: 20pt, weight: "bold", fill: ${theme.headerText})[${escapeTypstText(config.serverLabel)} ${COMMAND_NAMES.playerData.emoji} 玩家数据 · ${escapeTypstText(data.name)}]
]
#v(10pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 12pt, width: 100%)[
  #grid(columns: (auto, 1fr), column-gutter: 12pt, row-gutter: 9pt,
    [#strong[玩家 ID]], [#text(size: 9pt)[${escapeTypstText(data.xuid)}]],
    [#strong[历史游玩时间]], [${escapeTypstText(formatDuration(data.totalPlayMs))}],
    [#strong[挖掘方块总数]], [${formatInteger(data.blocksMined)}],
    [#strong[击杀生物总数]], [${formatInteger(data.mobsKilled)}],
    [#strong[进入次数]], [${formatInteger(data.joinCount)}],
    [#strong[金币数量]], [#text(fill: ${theme.statsText})[经济系统暂未接入]],
  )
]
#v(8pt)
#align(center)[#text(size: 8pt, fill: ${theme.statsText})[首次记录 ${escapeTypstText(formatDate(data.firstSeenMs))} · 最后在线 ${escapeTypstText(formatDate(data.lastSeenMs))}]]`
}

function formatPlayerDataText(config: Config, data: PlayerStatsResponse): string {
  return `${config.serverLabel} ${COMMAND_NAMES.playerData.emoji} 玩家数据：${data.name}\n玩家 ID：${data.xuid}\n历史游玩时间：${formatDuration(data.totalPlayMs)}\n挖掘方块总数：${formatInteger(data.blocksMined)}\n击杀生物总数：${formatInteger(data.mobsKilled)}\n金币数量：经济系统暂未接入`
}

function formatPlayerDataMarkdown(data: PlayerStatsResponse): string {
  return [
    `## ${escapeMarkdown(data.name)}`,
    '',
    `- 玩家 ID：${escapeMarkdown(data.xuid)}`,
    `- 历史游玩：${escapeMarkdown(formatDuration(data.totalPlayMs))}`,
    `- 挖掘方块：${formatInteger(data.blocksMined)}`,
    `- 击杀生物：${formatInteger(data.mobsKilled)}`,
    '- 金币数量：经济系统暂未接入',
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
