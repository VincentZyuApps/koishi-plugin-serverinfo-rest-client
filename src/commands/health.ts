import { Context, h } from 'koishi'
import { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { HealthResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './names'
import {
  resolveOutputModes,
  formatTimestamp,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../index'

function formatTextOutput(data: HealthResponse, label: string): string {
  return `${label} ${COMMAND_NAMES.health.emoji} 健康检查

📊 状态: ${data.status === 'healthy' ? '✅ 健康' : '❌ 异常'}
⏰ 时间戳: ${formatTimestamp(data.timestamp)}
⏱️ 运行时间: ${formatUptime(data.uptime)}`
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days}天 ${hours % 24}小时 ${minutes % 60}分钟`
  } else if (hours > 0) {
    return `${hours}小时 ${minutes % 60}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟 ${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

function createTemplatePayload(data: HealthResponse, label: string) {
  const healthy = data.status === 'healthy'
  return {
    label,
    status_emoji: healthy ? '✅' : '❌',
    status_text: healthy ? '健康' : '异常',
    timestamp: formatTimestamp(data.timestamp),
    uptime: formatUptime(data.uptime),
    generated_at: new Date().toLocaleString('zh-CN'),
  }
}

export function registerHealthCommand(
  ctx: Context,
  cfg: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
  label: string
) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.health), commandDescription(COMMAND_NAMES.health, '健康检查'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.health))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }) => {
      try {
        const data = await apiClient.get<HealthResponse>('/health')
        const modes = resolveOutputModes(options.mode, cfg)

        const results: h[] = []

        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, label)))
          } else if (mode === 'typst-image') {
            try {
              const pngBuffer = await renderTypstTemplate(
                ctx,
                cfg,
                logger,
                'healthStatus',
                createTemplatePayload(data, label),
              )
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
        logger.error(`健康检查失败: ${error}`)
        return `❌ 健康检查失败: ${error.message}`
      }
    })
}
