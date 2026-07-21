import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayerResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
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

function createTemplatePayload(player: PlayerResponse, config: Config, label: string) {
  const position = !config.hidePlayerCoordinates && player.position
    ? `${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)}`
    : null
  return {
    label,
    name: player.name,
    xuid: player.xuid,
    uuid: player.uuid,
    locale: player.locale || '未知',
    operator: player.isOperator ? '是' : '否',
    position,
  }
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
              const image = await renderTypstTemplate(ctx, cfg, logger, 'playerDetail', createTemplatePayload(data, cfg, label))
              results.push(h.image(image, 'image/png'))
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
