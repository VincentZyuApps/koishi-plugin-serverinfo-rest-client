import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { ServerResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
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

function createTemplatePayload(data: ServerResponse, label: string) {
  return {
    label,
    status: data.status,
    level_name: data.levelName,
    online_players: data.onlinePlayers,
    max_players: data.maxPlayers,
    bds_version: data.bdsVersion,
    protocol_version: data.protocolVersion,
    levilamina_version: data.levilaminaVersion,
    plugin_version: data.pluginVersion,
  }
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
              const image = await renderTypstTemplate(ctx, cfg, logger, 'serverInfo', createTemplatePayload(data, label))
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
        logger.error(`获取服务器详细信息失败: ${error}`)
        return `❌ 获取服务器详细信息失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
