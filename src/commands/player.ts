import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayerResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './names'
import {
  resolveOutputModes,
  getTypstRenderer,
  buildTypstTheme,
  escapeTypstText,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(player: PlayerResponse, config: Config, label: string): string {
  const lines = [
    `${label} 👤 玩家详情: ${player.name}`,
    '',
    `XUID: ${player.xuid}`,
    `UUID: ${player.uuid}`,
    `语言: ${player.locale || '未知'}`,
    `OP: ${player.isOperator ? '是' : '否'}`,
  ]
  if (!config.hidePlayerCoordinates && player.position) {
    lines.push(`位置: ${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`)
  }
  return lines.join('\n')
}

function generateTypstCode(player: PlayerResponse, config: Config, theme: ReturnType<typeof buildTypstTheme>, label: string): string {
  const coordinateRow = !config.hidePlayerCoordinates && player.position
    ? `[位置], [${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}],`
    : ''
  return `#set page(width: 430pt, height: auto, margin: 14pt, fill: ${theme.pageBg})
#set text(font: ("${theme.fontFamily}", "Noto Color Emoji", "Noto Sans CJK SC", "Microsoft YaHei"), size: 11pt, fill: ${theme.textColor}, lang: "zh")
#block(fill: ${theme.headerFill}, stroke: 2pt + ${theme.headerStroke}, radius: 6pt, inset: 10pt, width: 100%)[
  #align(center)[#text(size: 16pt, weight: "bold", fill: ${theme.headerText})[${escapeTypstText(label)} ${COMMAND_NAMES.player.emoji} 玩家 · ${escapeTypstText(player.name)}]]
]
#v(8pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 12pt, width: 100%)[
  #table(columns: (auto, 1fr), stroke: none, row-gutter: 7pt,
    [XUID], [#text(size: 9pt)[${escapeTypstText(player.xuid)}]],
    [UUID], [#text(size: 9pt)[${escapeTypstText(player.uuid)}]],
    [语言], [${escapeTypstText(player.locale || '未知')}],
    [OP], [${player.isOperator ? '是' : '否'}],
    ${coordinateRow}
  )
]`
}

export function registerPlayerCommand(ctx: Context, cfg: Config, apiClient: ApiClient, logger: any, prefix: string, label: string) {
  ctx.command(
    `${primaryCommand(prefix, COMMAND_NAMES.player)} <name:string>`,
    commandDescription(COMMAND_NAMES.player, '查询指定在线玩家'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.player))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }, name) => {
      if (!name) return `❌ 请指定玩家名称，例如: ${primaryCommand(prefix, COMMAND_NAMES.player)} Steve`
      try {
        const data = await apiClient.get<PlayerResponse>('/player', { name })
        const modes = resolveOutputModes(options.mode, cfg)
        const results: h[] = []
        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, cfg, label)))
          } else {
            try {
              const renderer = await getTypstRenderer(ctx, cfg, logger)
              results.push(h.image(await renderer.toPng(generateTypstCode(data, cfg, buildTypstTheme(cfg), label), cfg.typstRenderScale), 'image/png'))
            } catch (error) {
              const fallback = createTypstFailureOutput(error, cfg, modes, formatTextOutput(data, cfg, label))
              if (fallback) results.push(fallback)
            }
          }
        }
        if (cfg.quoteCommandReplies && session.messageId) return h('', [h.quote(session.messageId), ...results])
        return results
      } catch (error) {
        logger.error(`查询玩家失败: ${error}`)
        return `❌ 查询玩家失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
