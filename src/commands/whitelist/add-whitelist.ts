import type { WhitelistBindingResponse } from '../../api/types'
import { hasPermission } from '../../permissions'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from '../command-names'
import type { CommandRegistrationContext } from '../types'
import {
  formatAllowlistResult,
  getSelfId,
  maskIdentifier,
  parseTargetUserId,
  quoteIfNeeded,
  requesterId,
} from './shared'

export function registerAddWhitelistCommand({
  ctx,
  config,
  apiClient,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const command = COMMAND_NAMES.addWhitelist
  const commandName = primaryCommand(prefix, command)
  ctx.command(
    `${commandName} <playerName:string> <targetUser:text>`,
    commandDescription(command, '管理员为指定聊天用户创建 Xbox 玩家绑定'),
  )
    .alias(aliasCommand(prefix, command))
    .option('force', '-f, --force 强制替换目标用户和 Xbox 玩家已有的冲突绑定')
    .action(async ({ session, options }, rawPlayerName, rawTargetUser) => {
      if (!hasPermission(session, config.whitelistManagementAdminList)) {
        return '你不在白名单管理权限名单中'
      }
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请提供 Xbox 玩家名，例如：${commandName} Steve @目标用户`
      const targetUserId = parseTargetUserId(rawTargetUser)
      if (!targetUserId) return `请艾特目标用户或提供 userId，例如：${commandName} Steve @目标用户`
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法添加白名单'
      const selfId = getSelfId(session)
      if (!selfId) return '无法识别当前 Bot 的 selfId，请检查适配器会话信息'

      try {
        const data = await apiClient.post<WhitelistBindingResponse>('/whitelist/add', {
          platform: session.platform,
          selfId,
          userId: targetUserId,
          channelId: session.channelId,
          playerName,
          requester: requesterId(session),
          force: Boolean(options.force),
        }, true)
        const state = data.forced ? '已强制创建绑定' : (data.created ? '已创建绑定' : '绑定已经存在')
        const replacements = (data.replacedBindings || []).map((binding) =>
          `\n- 已替换：${maskIdentifier(binding.userId)} ↔ ${binding.playerName}`,
        ).join('')
        return quoteIfNeeded(
          session,
          config,
          `${state}：${maskIdentifier(data.binding.userId)} ↔ ${data.binding.playerName}${replacements}${formatAllowlistResult(data)}`,
        )
      } catch (error) {
        logger.error(`添加白名单失败: ${error}`)
        return `添加白名单失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
