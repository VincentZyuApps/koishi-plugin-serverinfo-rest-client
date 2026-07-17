import type { Context } from 'koishi'
import type { ApiClient } from '../api/client'
import type { PlayerHistoryResponse } from '../api/types'
import type { Config } from '../config'
import { buildTypstTheme, escapeTypstText, getTypstRenderer } from '../index'
import { buildCommandKeyboard, escapeMarkdown, sendRenderedReply } from '../qq'

export function registerHistoryCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  ctx.command(`${prefix}.历史记录 [page:number]`, '查询历史玩家记录')
    .action(async ({ session }, requestedPage) => {
      const page = Math.max(1, Math.floor(Number(requestedPage) || 1))
      try {
        const data = await apiClient.get<PlayerHistoryResponse>('/players/history', {
          page: String(page),
          pageSize: String(config.historyPageSize),
        })
        const renderer = await getTypstRenderer(ctx, config, logger)
        const image = await renderer.toPng(generateHistoryTypst(config, data), config.typstRenderScale)
        const text = formatHistoryText(config, data)
        const buttons = []
        if (data.page > 1) {
          buttons.push({ label: '上一页', command: `${prefix}.历史记录 ${data.page - 1}` })
        }
        buttons.push({ label: '刷新', command: `${prefix}.历史记录 ${data.page}`, style: 1 })
        if (data.page < data.pageCount) {
          buttons.push({ label: '下一页', command: `${prefix}.历史记录 ${data.page + 1}` })
        }
        return sendRenderedReply(ctx, session, config, {
          image,
          text,
          title: `${config.serverLabel} 历史玩家`,
          markdownBody: formatHistoryMarkdown(data),
          keyboard: buildCommandKeyboard(config, buttons),
        }, logger)
      } catch (error) {
        logger.error(`查询历史记录失败: ${error}`)
        return `查询历史记录失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}

function generateHistoryTypst(config: Config, data: PlayerHistoryResponse): string {
  const theme = buildTypstTheme(config)
  const rows = data.players.length
    ? data.players.map((player, index) => {
      const number = (data.page - 1) * data.pageSize + index + 1
      return `[${number}], [${escapeTypstText(player.name)}], [${escapeTypstText(formatDuration(player.totalPlayMs))}], [${escapeTypstText(formatDate(player.lastSeenMs))}],`
    }).join('\n')
    : `[--], [暂无历史玩家], [--], [--],`

  return `#set page(width: 620pt, height: auto, margin: 16pt, fill: ${theme.pageBg})
#set text(font: ("${escapeTypstText(theme.fontFamily)}", "Noto Sans CJK SC", "Microsoft YaHei"), size: 10pt, fill: ${theme.textColor}, lang: "zh")
#block(fill: ${theme.headerFill}, stroke: 2pt + ${theme.headerStroke}, radius: 6pt, inset: 13pt, width: 100%)[
  #grid(columns: (1fr, auto),
    [#text(size: 20pt, weight: "bold", fill: ${theme.headerText})[${escapeTypstText(config.serverLabel)} · 历史玩家]],
    [#text(size: 11pt, weight: "bold", fill: ${theme.headerText})[共 ${data.total} 人]],
  )
]
#v(10pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 10pt, width: 100%)[
  #table(
    columns: (34pt, 1.2fr, 1fr, 1.25fr),
    inset: 6pt,
    stroke: 0.6pt + ${theme.panelStroke},
    align: (center, left, left, left),
    table.header([#strong[序号]], [#strong[玩家]], [#strong[累计游玩]], [#strong[最后在线]]),
    ${rows}
  )
]
#v(7pt)
#align(center)[#text(size: 8pt, fill: ${theme.statsText})[第 ${data.page} / ${data.pageCount} 页 · 数据从统计功能启用后开始累计]]`
}

function formatHistoryText(config: Config, data: PlayerHistoryResponse): string {
  const names = data.players.length
    ? data.players.map((player, index) => `${(data.page - 1) * data.pageSize + index + 1}. ${player.name}`).join('\n')
    : '暂无历史玩家'
  return `${config.serverLabel} 历史玩家共 ${data.total} 人（第 ${data.page}/${data.pageCount} 页）\n${names}`
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
