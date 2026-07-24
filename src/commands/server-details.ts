import { h } from 'koishi'
import type { ServerResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../typst'
import type { CommandRegistrationContext } from './types'
import { formatErrorForLog, logInfo } from '../logger'

function formatTextOutput(data: ServerResponse, label: string): string {
  return `${label} ${COMMAND_NAMES.serverDetails.emoji} 服务器详细信息

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

export function registerServerDetailsCommand({
  ctx,
  config,
  apiClient,
  prefix,
  label,
}: CommandRegistrationContext) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.serverDetails), commandDescription(COMMAND_NAMES.serverDetails, '服务器详细信息'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.serverDetails))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<ServerResponse>('/server')
        const modes = resolveOutputModes(options.mode, config)
        const results: h[] = []
        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else {
            try {
              const image = await renderTypstTemplate(ctx, config, 'serverInfo', createTemplatePayload(data, label))
              results.push(h.image(image, 'image/png'))
            } catch (error) {
              const fallback = createTypstFailureOutput(error, config, modes, formatTextOutput(data, label))
              if (fallback) results.push(fallback)
            }
          }
        }
        if (config.quoteCommandReplies && session.messageId) return h('', [h.quote(session.messageId), ...results])
        return results
      } catch (error) {
        logInfo(ctx, config, '[ERROR] 获取服务器详细信息失败', formatErrorForLog(error))
        return `❌ 获取服务器详细信息失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
