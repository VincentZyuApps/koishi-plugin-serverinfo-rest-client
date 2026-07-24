import { h } from 'koishi'
import type { PlayersCountResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../typst'
import type { CommandRegistrationContext } from './types'
import { formatErrorForLog, logInfo } from '../logger'

function formatTextOutput(data: PlayersCountResponse, label: string): string {
  return `${label} ${COMMAND_NAMES.playerCount.emoji} 玩家数量

👥 当前在线: ${data.count} 人`
}

export function registerPlayerCountCommand({
  ctx,
  config,
  apiClient,
  prefix,
  label,
}: CommandRegistrationContext) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.playerCount), commandDescription(COMMAND_NAMES.playerCount, '玩家数量'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.playerCount))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<PlayersCountResponse>('/players/count')
        const modes = resolveOutputModes(options.mode, config)

        const results: h[] = []

        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else if (mode === 'typst-image') {
            try {
              const pngBuffer = await renderTypstTemplate(ctx, config, 'playersCount', {
                label,
                count: data.count,
                generated_at: new Date().toLocaleString('zh-CN'),
              })
              results.push(h.image(pngBuffer, 'image/png'))
            } catch (err) {
              logInfo(ctx, config, '[WARN] 玩家数量 Typst 渲染失败', formatErrorForLog(err))
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
        logInfo(ctx, config, '[ERROR] 获取玩家数量失败', formatErrorForLog(error))
        return `❌ 获取玩家数量失败: ${error.message}`
      }
    })
}
