import type { WhitelistRemovalResponse } from '../../api/types'
import { hasPermission } from '../../permissions'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from '../command-names'
import type { CommandRegistrationContext } from '../types'
import { formatAllowlistResult, maskIdentifier, quoteIfNeeded, requesterId } from './shared'

export function registerRemoveWhitelistCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const command = COMMAND_NAMES.removeWhitelist
  const commandName = primaryCommand(prefix, command)
  ctx.command(
    `${commandName} <playerName:text>`,
    commandDescription(command, '管理员按 Xbox 玩家名移除唯一绑定；服务端启用同步时同时移除 BDS allowlist 项目'),
  )
    .alias(aliasCommand(prefix, command))
    .action(async ({ session }, rawPlayerName) => {
      if (!hasPermission(session, config.whitelistManagementAdminList)) {
        return '你不在白名单管理权限名单中'
      }
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请提供 Xbox 玩家名，例如：${commandName} Steve`
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法移除白名单'
      try {
        const data = await apiClient.post<WhitelistRemovalResponse>('/whitelist/remove', {
          playerName,
          requester: requesterId(session),
        }, true)
        return quoteIfNeeded(
          session,
          config,
          `已移除绑定：${maskIdentifier(data.binding.userId)} ↔ ${data.binding.playerName}${formatAllowlistResult(data)}`,
        )
      } catch (error) {
        logger.error(`移除白名单失败: ${error}`)
        return `移除白名单失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
