import type { WhitelistBindingResponse } from '../../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from '../command-names'
import type { CommandRegistrationContext } from '../types'
import { formatAllowlistResult, getSelfId, quoteIfNeeded } from './shared'

export function registerBindPlayerCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const bindPlayerCommand = primaryCommand(prefix, COMMAND_NAMES.bindPlayer)
  ctx.command(
    `${bindPlayerCommand} <playerName:text>`,
    commandDescription(COMMAND_NAMES.bindPlayer, '绑定当前聊天账号与 Xbox 玩家（服务端启用 BDS allowlist 同步时，同时更新进服名单）'),
    { authority: config.whitelistBindingAuthority },
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.bindPlayer))
    .action(async ({ session }, rawPlayerName) => {
      if (config.whitelistBindGroupOnly && session.isDirect) return '绑定玩家只能在群聊中使用'
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请提供 Xbox 玩家名，例如：${bindPlayerCommand} Steve`
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法绑定玩家'
      const selfId = getSelfId(session)
      if (!selfId) return '无法识别当前 Bot 的 selfId，请检查适配器会话信息'
      try {
        const data = await apiClient.post<WhitelistBindingResponse>('/whitelist/bind', {
          platform: session.platform,
          selfId,
          userId: session.userId,
          channelId: session.channelId,
          playerName,
        }, true)
        const state = data.created ? '绑定成功' : '已经绑定'
        return quoteIfNeeded(session, config, `${state}：${data.binding.playerName}${formatAllowlistResult(data)}`)
      } catch (error) {
        logger.error(`绑定玩家失败: ${error}`)
        return `绑定玩家失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
