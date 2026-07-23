import type { WhitelistStateResponse } from '../../api/types'
import { hasPermission } from '../../permissions'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from '../command-names'
import type { CommandRegistrationContext } from '../types'
import { maskIdentifier, quoteIfNeeded } from './shared'

export function registerWhitelistBindingCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const command = COMMAND_NAMES.whitelistBinding
  const commandName = primaryCommand(prefix, command)
  ctx.command(
    `${commandName} <playerName:text>`,
    commandDescription(command, '管理员查询 Xbox 玩家的聊天账号绑定状态'),
  )
    .alias(aliasCommand(prefix, command))
    .action(async ({ session }, rawPlayerName) => {
      if (!hasPermission(session, config.whitelistManagementAdminList)) {
        return '你不在白名单管理权限名单中'
      }
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请提供 Xbox 玩家名，例如：${commandName} Steve`
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法查询白名单绑定'
      try {
        const data = await apiClient.post<WhitelistStateResponse>('/whitelist/state', { playerName }, true)
        if (!data.bound || !data.binding) {
          return quoteIfNeeded(session, config, `玩家 ${data.playerName} 当前未绑定聊天账号`)
        }
        return quoteIfNeeded(session, config, [
          `玩家：${data.binding.playerName}`,
          '绑定状态：已绑定',
          `聊天平台：${data.binding.platform}`,
          `用户 ID：${maskIdentifier(data.binding.userId)}`,
          `Bot ID：${maskIdentifier(data.binding.selfId)}`,
        ].join('\n'))
      } catch (error) {
        logger.error(`查询白名单绑定失败: ${error}`)
        return `查询白名单绑定失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
