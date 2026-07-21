import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayersNamesResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(data: PlayersNamesResponse, label: string): string {
  if (data.count === 0) {
    return `${label} ${COMMAND_NAMES.playersNames.emoji} 玩家名列表

当前没有玩家在线`
  }

  const nameList = data.names.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
  return `${label} ${COMMAND_NAMES.playersNames.emoji} 玩家名列表 (${data.count} 人在线)

${nameList}`
}

export function registerPlayersNamesCommand(
  ctx: Context,
  cfg: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
  label: string
) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.playersNames), commandDescription(COMMAND_NAMES.playersNames, '玩家名列表'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.playersNames))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<PlayersNamesResponse>('/players/names')
        const modes = resolveOutputModes(options.mode, cfg)

        const results: h[] = []

        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else if (mode === 'typst-image') {
            try {
              const pngBuffer = await renderTypstTemplate(ctx, cfg, logger, 'playerNames', {
                label,
                names: data.names,
                count: data.count,
                generated_at: new Date().toLocaleString('zh-CN'),
              })
              results.push(h.image(pngBuffer, 'image/png'))
            } catch (err) {
              logger.warn(`Typst 渲染失败: ${err}`)
              const fallback = createTypstFailureOutput(err, cfg, modes, formatTextOutput(data, label))
              if (fallback) results.push(fallback)
            }
          }
        }

        if (cfg.quoteCommandReplies && session.messageId) {
          return h('', [h.quote(session.messageId), ...results])
        }
        return results
      } catch (error) {
        logger.error(`获取玩家名列表失败: ${error}`)
        return `❌ 获取玩家名列表失败: ${error.message}`
      }
    })
}
