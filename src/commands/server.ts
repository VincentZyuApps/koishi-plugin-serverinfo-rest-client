import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { ServerResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './names'
import {
  resolveOutputModes,
  getTypstRenderer,
  buildTypstTheme,
  escapeTypstText,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(data: ServerResponse, label: string): string {
  return `${label} ${COMMAND_NAMES.server.emoji} 服务器详细信息

📊 状态: ${data.status}
🌍 存档: ${data.levelName}
👥 在线玩家: ${data.onlinePlayers} / ${data.maxPlayers}
🎮 BDS 版本: ${data.bdsVersion}
📡 协议版本: ${data.protocolVersion}
⚙️ LeviLamina: ${data.levilaminaVersion}
🔌 serverinfo-rest: ${data.pluginVersion}`
}

function generateTypstCode(data: ServerResponse, theme: ReturnType<typeof buildTypstTheme>, label: string): string {
  const rows = [
    ['状态', data.status],
    ['存档', data.levelName],
    ['在线玩家', `${data.onlinePlayers} / ${data.maxPlayers}`],
    ['BDS', data.bdsVersion],
    ['协议版本', String(data.protocolVersion)],
    ['LeviLamina', data.levilaminaVersion],
    ['插件', data.pluginVersion],
  ].map(([key, value]) => `[${escapeTypstText(key)}], [${escapeTypstText(value)}],`).join('\n')
  return `#set page(width: 420pt, height: auto, margin: 14pt, fill: ${theme.pageBg})
#set text(font: ("${theme.fontFamily}", "Noto Color Emoji", "Noto Sans CJK SC", "Microsoft YaHei"), size: 11pt, fill: ${theme.textColor}, lang: "zh")
#block(fill: ${theme.headerFill}, stroke: 2pt + ${theme.headerStroke}, radius: 6pt, inset: 10pt, width: 100%)[
  #align(center)[#text(size: 16pt, weight: "bold", fill: ${theme.headerText})[${escapeTypstText(label)} ${COMMAND_NAMES.server.emoji} 服务器信息]]
]
#v(8pt)
#block(fill: ${theme.panelFill}, stroke: 1pt + ${theme.panelStroke}, radius: 4pt, inset: 12pt, width: 100%)[
  #table(columns: (auto, 1fr), stroke: none, row-gutter: 7pt, ${rows})
]`
}

export function registerServerCommand(ctx: Context, cfg: Config, apiClient: ApiClient, logger: any, prefix: string, label: string) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.server), commandDescription(COMMAND_NAMES.server, '服务器详细信息'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.server))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<ServerResponse>('/server')
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
        logger.error(`获取服务器详细信息失败: ${error}`)
        return `❌ 获取服务器详细信息失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
