import { h } from 'koishi'
import type { PlayersNamesResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../typst'
import type { CommandRegistrationContext } from './types'
import { formatErrorForLog, logInfo } from '../logger'

function formatTextOutput(data: PlayersNamesResponse, label: string): string {
  if (data.count === 0) {
    return `${label} ${COMMAND_NAMES.playerNames.emoji} 玩家名列表

当前没有玩家在线`
  }

  const nameList = data.names.map((name, i) => `  ${i + 1}. ${name}`).join('\n')
  return `${label} ${COMMAND_NAMES.playerNames.emoji} 玩家名列表 (${data.count} 人在线)

${nameList}`
}

export function registerPlayerNamesCommand({
  ctx,
  config,
  apiClient,
  prefix,
  label,
}: CommandRegistrationContext) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.playerNames), commandDescription(COMMAND_NAMES.playerNames, '玩家名列表'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.playerNames))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<PlayersNamesResponse>('/players/names')
        const modes = resolveOutputModes(options.mode, config)

        const results: h[] = []

        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else if (mode === 'typst-image') {
            try {
              const pngBuffer = await renderTypstTemplate(ctx, config, 'playerNames', {
                label,
                names: data.names,
                count: data.count,
                generated_at: new Date().toLocaleString('zh-CN'),
              })
              results.push(h.image(pngBuffer, 'image/png'))
            } catch (err) {
              logInfo(ctx, config, '[WARN] 玩家名列表 Typst 渲染失败', formatErrorForLog(err))
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
        logInfo(ctx, config, '[ERROR] 获取玩家名列表失败', formatErrorForLog(error))
        return `❌ 获取玩家名列表失败: ${error.message}`
      }
    })
}
