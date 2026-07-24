import { h } from 'koishi'
import type { StatusResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../typst'
import type { CommandRegistrationContext } from './types'
import { CLIENT_VERSION } from '../version'
import { formatErrorForLog, logInfo } from '../logger'

function formatTextOutput(data: StatusResponse, label: string): string {
  const statusEmoji = data.status === 'online' ? '🟢' : '🔴'
  return `${label} ${COMMAND_NAMES.serverStatus.emoji} 服务器状态

${statusEmoji} 状态: ${data.status}
🔌 服务端插件: ${data.plugin} v${data.version}
🤖 Bot 客户端: v${CLIENT_VERSION}
👥 在线玩家: ${data.playerCount}
🎮 BDS 版本: ${data.bdsVersion}
📡 协议版本: ${data.protocolVersion}`
}

function createTemplatePayload(data: StatusResponse, label: string) {
  return {
    label,
    status_emoji: data.status === 'online' ? '🟢' : '🔴',
    status: data.status,
    plugin: data.plugin,
    plugin_version: data.version,
    client_version: CLIENT_VERSION,
    player_count: data.playerCount,
    bds_version: data.bdsVersion,
    protocol_version: data.protocolVersion,
    generated_at: new Date().toLocaleString('zh-CN'),
  }
}

export function registerServerStatusCommand({
  ctx,
  config,
  apiClient,
  prefix,
  label,
}: CommandRegistrationContext) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.serverStatus), commandDescription(COMMAND_NAMES.serverStatus, '服务器状态'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.serverStatus))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<StatusResponse>('/status')
        const modes = resolveOutputModes(options.mode, config)

        const results: h[] = []

        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else if (mode === 'typst-image') {
            try {
              const pngBuffer = await renderTypstTemplate(
                ctx,
                config,
                'serverStatus',
                createTemplatePayload(data, label),
              )
              results.push(h.image(pngBuffer, 'image/png'))
            } catch (err) {
              logInfo(ctx, config, '[WARN] 服务器状态 Typst 渲染失败', formatErrorForLog(err))
              const fallback = createTypstFailureOutput(err, config, modes, formatTextOutput(data, label))
              if (fallback) results.push(fallback)
            }
          }
        }

        if (config.quoteCommandReplies && session.messageId) {
          return h('', [h.quote(session.messageId), ...results])
        }
        return results
      } catch (error) {
        logInfo(ctx, config, '[ERROR] 获取服务器状态失败', formatErrorForLog(error))
        return `❌ 获取服务器状态失败: ${error.message}`
      }
    })
}
