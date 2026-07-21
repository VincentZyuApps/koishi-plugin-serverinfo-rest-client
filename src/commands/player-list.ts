import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayersResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(data: PlayersResponse, label: string): string {
  if (!data.players.length) return `${label} ${COMMAND_NAMES.players.emoji} 玩家列表\n\n当前没有玩家在线`
  return `${label} ${COMMAND_NAMES.players.emoji} 玩家列表 (${data.count} 人在线)\n\n${data.players.map((player, index) => `${index + 1}. ${player.name}`).join('\n')}`
}

export function registerPlayersCommand(ctx: Context, cfg: Config, apiClient: ApiClient, logger: any, prefix: string, label: string) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.players), commandDescription(COMMAND_NAMES.players, '玩家列表'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.players))
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
              const image = await renderTypstTemplate(ctx, cfg, logger, 'playersList', {
                label,
                count: data.count,
                players: data.players.map(player => ({ name: player.name })),
              })
              results.push(h.image(image, 'image/png'))
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
