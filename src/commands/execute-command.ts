import { h } from 'koishi'
import type { CommandExecutionResponse } from '../api/types'
import { hasPermission } from '../permissions'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import type { CommandRegistrationContext } from './types'

export function registerExecuteCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const executeCommand = primaryCommand(prefix, COMMAND_NAMES.executeCommand)
  ctx.command(
    `${executeCommand} <command:text>`,
    commandDescription(COMMAND_NAMES.executeCommand, '执行 BDS 管理命令'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.executeCommand))
    .action(async ({ session }, rawCommand) => {
      if (!hasPermission(session, config.commandExecutionAdminList)) {
        return '你不在执行命令权限名单中'
      }
      const command = String(rawCommand || '').trim().replace(/^\//, '')
      if (!command) return `请提供命令，例如：${executeCommand} list`
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法执行命令'
      try {
        const data = await apiClient.post<CommandExecutionResponse>('/admin/command', {
          command,
          requester: `${session.platform}:${session.userId}`,
        }, true)
        const text = `${data.success ? '执行成功' : '执行失败'}：${data.command}\n${data.output || '服务器没有返回输出'}`
        if (config.quoteCommandReplies && session.messageId) {
          return h('', [h.quote(session.messageId), h.text(text)])
        }
        return text
      } catch (error) {
        logger.error(`执行管理命令失败: ${error}`)
        return `执行命令失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
