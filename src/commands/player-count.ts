import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayersCountResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(data: PlayersCountResponse, label: string): string {
  return `${label} ${COMMAND_NAMES.playersCount.emoji} 玩家数量

👥 当前在线: ${data.count} 人`
}

export function registerPlayersCountCommand(
  ctx: Context,
  cfg: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
  label: string
) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.playersCount), commandDescription(COMMAND_NAMES.playersCount, '玩家数量'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.playersCount))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<PlayersCountResponse>('/players/count')
        const modes = resolveOutputModes(options.mode, cfg)

        const results: h[] = []

        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else if (mode === 'typst-image') {
            try {
              const pngBuffer = await renderTypstTemplate(ctx, cfg, logger, 'playersCount', {
                label,
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
        logger.error(`获取玩家数量失败: ${error}`)
        return `❌ 获取玩家数量失败: ${error.message}`
      }
    })
}
