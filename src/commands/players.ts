import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayersResponse } from '../api/types'
import {
  resolveOutputModes,
  getTypstRenderer,
  buildTypstTheme,
  escapeTypstText,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(data: PlayersResponse, label: string): string {
  if (!data.players.length) return `${label} 👥 玩家列表\n\n当前没有玩家在线`
  return `${label} 👥 玩家列表 (${data.count} 人在线)\n\n${data.players.map((player, index) => `${index + 1}. ${player.name}`).join('\n')}`
}

function generateTypstCode(data: PlayersResponse, theme: ReturnType<typeof buildTypstTheme>, label: string): string {
  const rows = data.players.length
    ? data.players.map((player, index) => `[${index + 1}.], [${escapeTypstText(player.name)}],`).join('\n')
    : `[--], [当前没有玩家在线],`
  return `#set page(width: 390pt, height: auto, margin: 14pt, fill: ${theme.pageBg})
#set text(font: ("${theme.fontFamily}", "Noto Sans CJK SC", "Microsoft YaHei"), size: 11pt, fill: ${theme.textColor}, lang: "zh")
#block(fill: ${theme.headerFill}, stroke: 2pt + ${theme.headerStroke}, radius: 6pt, inset: 10pt, width: 100%)[
  #align(center)[#text(size: 16pt, weight: "bold", fill: ${theme.headerText})[${escapeTypstText(label)} 在线玩家 ${data.count}]]
]
#v(8pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 12pt, width: 100%)[
  #table(columns: (auto, 1fr), stroke: none, row-gutter: 6pt, ${rows})
]`
}

export function registerPlayersCommand(ctx: Context, cfg: Config, apiClient: ApiClient, logger: any, prefix: string, label: string) {
  ctx.command(`${prefix}.players`, '玩家列表')
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<PlayersResponse>('/players')
        const modes = resolveOutputModes(options.mode, cfg)
        const results: h[] = []
        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else {
            try {
              const renderer = await getTypstRenderer(ctx, cfg, logger)
              results.push(h.image(await renderer.toPng(generateTypstCode(data, buildTypstTheme(cfg), label), cfg.typstRenderScale), 'image/png'))
            } catch (error) {
              const fallback = createTypstFailureOutput(error, cfg, modes, formatTextOutput(data, label))
              if (fallback) results.push(fallback)
            }
          }
        }
        if (cfg.quoteCommandReplies && session.messageId) return h('', [h.quote(session.messageId), ...results])
        return results
      } catch (error) {
        logger.error(`获取玩家列表失败: ${error}`)
        return `❌ 获取玩家列表失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
