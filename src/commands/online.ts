import type { Context } from 'koishi'
import type { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { OverviewResponse } from '../api/types'
import type { OnlineStatusResult } from '../types'
import { buildTypstTheme, escapeTypstText, getTypstRenderer } from '../index'
import { sendOnlineStatus } from '../qq'

async function renderOnlineStatus(
  ctx: Context,
  config: Config,
  result: OnlineStatusResult,
  logger: any,
): Promise<Buffer> {
  const renderer = await getTypstRenderer(ctx, config, logger)
  return renderer.toPng(generateOnlineStatusTypst(config, result), config.typstRenderScale)
}

export function generateOnlineStatusTypst(config: Config, result: OnlineStatusResult): string {
  const theme = buildTypstTheme(config)
  const checkedAt = new Date(result.checkedAt).toLocaleString('zh-CN')
  const common = `#set page(width: 540pt, height: auto, margin: 16pt, fill: ${theme.pageBg})
#set text(font: ("${escapeTypstText(theme.fontFamily)}", "Noto Sans CJK SC", "Microsoft YaHei"), size: 11pt, fill: ${theme.textColor}, lang: "zh")`

  if (!result.online || !result.overview) {
    return `${common}
#block(fill: rgb("#8f3b46"), radius: 6pt, inset: 14pt, width: 100%)[
  #align(center)[#text(size: 22pt, weight: "bold", fill: white)[${escapeTypstText(config.serverLabel)} · 服务器离线]]
]
#v(10pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 14pt, width: 100%)[
  #text(size: 13pt, weight: "bold", fill: rgb("#8f3b46"))[无法连接服务器]
  #v(8pt)
  #text[${escapeTypstText(result.error || '服务器接口暂时不可用')}]
  #v(8pt)
  #text(size: 9pt, fill: ${theme.statsText})[查询耗时 ${result.latencyMs} ms · ${escapeTypstText(checkedAt)}]
]`
  }

  const data = result.overview
  const tps = data.tps
  const statusColor = tps.avg10s >= 18 ? '#2f855a' : tps.avg10s >= 15 ? '#b7791f' : '#c53030'
  return `${common}
#block(fill: ${theme.headerFill}, stroke: 2pt + ${theme.headerStroke}, radius: 6pt, inset: 14pt, width: 100%)[
  #grid(columns: (1fr, auto), align: (left, right),
    [#text(size: 22pt, weight: "bold", fill: ${theme.headerText})[${escapeTypstText(config.serverLabel)}]],
    [#text(size: 13pt, weight: "bold", fill: ${theme.headerText})[在线 ${data.players.online} / ${data.players.max}]],
  )
]
#v(10pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 12pt, width: 100%)[
  #text(size: 12pt, weight: "bold", fill: ${theme.sectionTitle})[TPS 运行状态]
  #v(8pt)
  #grid(columns: (1fr, 1fr, 1fr, 1fr), gutter: 7pt,
    [#align(center)[#text(size: 16pt, weight: "bold", fill: rgb("${statusColor}"))[${tps.realtime.toFixed(2)}] #linebreak() #text(size: 8pt)[实时 1s]]],
    [#align(center)[#text(size: 22pt, weight: "bold", fill: rgb("${statusColor}"))[${tps.avg10s.toFixed(2)}] #linebreak() #text(size: 8pt)[短期 10s]]],
    [#align(center)[#text(size: 28pt, weight: "bold", fill: rgb("${statusColor}"))[${tps.avg60s.toFixed(2)}] #linebreak() #text(size: 8pt)[中期 60s]]],
    [#align(center)[#text(size: 36pt, weight: "bold", fill: rgb("${statusColor}"))[${tps.avg300s.toFixed(2)}] #linebreak() #text(size: 8pt)[长期 300s]]],
  )
]
#v(8pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 12pt, width: 100%)[
  #grid(columns: (auto, 1fr, auto, 1fr), column-gutter: 8pt, row-gutter: 7pt,
    [#text(weight: "bold", fill: ${theme.sectionTitle})[BDS]], [${escapeTypstText(data.versions.bds)}],
    [#text(weight: "bold", fill: ${theme.sectionTitle})[协议]], [${data.versions.protocol}],
    [#text(weight: "bold", fill: ${theme.sectionTitle})[LeviLamina]], [${escapeTypstText(data.versions.levilamina)}],
    [#text(weight: "bold", fill: ${theme.sectionTitle})[插件]], [${escapeTypstText(data.versions.plugin)}],
  )
]
#v(8pt)
#align(center)[#text(size: 8pt, fill: ${theme.statsText})[延迟 ${result.latencyMs} ms · TPS 已采样 ${tps.sampledSeconds}s · ${escapeTypstText(checkedAt)}]]`
}

export function registerOnlineCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  ctx.command(`${prefix}.查在线`, '查询服务器在线状态')
    .action(async ({ session }) => {
      const startedAt = Date.now()
      let result: OnlineStatusResult
      try {
        const overview = await apiClient.get<OverviewResponse>('/overview')
        result = {
          online: true,
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          overview,
        }
      } catch (error) {
        result = {
          online: false,
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          error: sanitizeError(error),
        }
      }

      let image: Buffer | null = null
      try {
        image = await renderOnlineStatus(ctx, config, result, logger)
      } catch (error) {
        logger.warn(`查在线 Typst 渲染失败: ${error}`)
      }
      return sendOnlineStatus(ctx, session, config, result, image, logger)
    })
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/https?:\/\/\S+/gi, '服务器接口')
    .replace(/token=[^&\s]+/gi, 'token=***')
    .slice(0, 160)
}
