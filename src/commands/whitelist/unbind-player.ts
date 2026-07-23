import type { WhitelistBindingResponse } from '../../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from '../command-names'
import type { CommandRegistrationContext } from '../types'
import { formatAllowlistResult, getSelfId, quoteIfNeeded } from './shared'

export function registerUnbindPlayerCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const unbindPlayerCommand = primaryCommand(prefix, COMMAND_NAMES.unbindPlayer)
  ctx.command(
    unbindPlayerCommand,
    commandDescription(COMMAND_NAMES.unbindPlayer, '解除当前聊天账号的玩家绑定；服务端启用同步时同时移除 BDS allowlist 项目'),
    { authority: config.whitelistBindingAuthority },
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.unbindPlayer))
    .action(async ({ session }) => {
      if (config.whitelistUnbindGroupOnly && session.isDirect) return '解绑玩家只能在群聊中使用'
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法解绑玩家'
      const selfId = getSelfId(session)
      if (!selfId) return '无法识别当前 Bot 的 selfId，请检查适配器会话信息'
      try {
        const data = await apiClient.post<WhitelistBindingResponse>('/whitelist/unbind', {
          platform: session.platform,
          selfId,
          userId: session.userId,
        }, true)
        return quoteIfNeeded(session, config, `已解除与 ${data.binding.playerName} 的玩家绑定${formatAllowlistResult(data)}`)
      } catch (error) {
        logger.error(`解绑玩家失败: ${error}`)
        return `解绑玩家失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
