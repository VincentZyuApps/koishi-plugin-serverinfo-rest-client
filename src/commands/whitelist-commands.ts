import { h, type Context, type Session } from 'koishi'
import type { ApiClient } from '../api/client'
import type {
  WhitelistBindingResponse,
  WhitelistRemovalResponse,
  WhitelistStateResponse,
} from '../api/types'
import type { Config } from '../config'
import { hasPermission } from '../permissions'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'

export function registerWhitelistCommands(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  registerSelfBindingCommands(ctx, config, apiClient, logger, prefix)
  registerAdminAddBindingCommand(ctx, config, apiClient, logger, prefix)
  registerAdminBindingStateCommand(ctx, config, apiClient, logger, prefix)
  registerAdminRemoveBindingCommand(ctx, config, apiClient, logger, prefix)
}

function registerSelfBindingCommands(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  const bindPlayerCommand = primaryCommand(prefix, COMMAND_NAMES.bindWhitelist)
  const unbindPlayerCommand = primaryCommand(prefix, COMMAND_NAMES.unbindWhitelist)

  ctx.command(`${bindPlayerCommand} <playerName:text>`, commandDescription(COMMAND_NAMES.bindWhitelist, '绑定当前聊天账号与 Xbox 玩家（服务端启用 BDS allowlist 同步时，同时更新进服名单）'), {
    authority: config.whitelistBindingAuthority,
  })
    .alias(aliasCommand(prefix, COMMAND_NAMES.bindWhitelist))
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

  ctx.command(unbindPlayerCommand, commandDescription(COMMAND_NAMES.unbindWhitelist, '解除当前聊天账号的玩家绑定；服务端启用同步时同时移除 BDS allowlist 项目'), {
    authority: config.whitelistBindingAuthority,
  })
    .alias(aliasCommand(prefix, COMMAND_NAMES.unbindWhitelist))
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

function registerAdminAddBindingCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
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

function registerAdminBindingStateCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
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

function registerAdminRemoveBindingCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
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

export function parseTargetUserId(rawTargetUser: unknown): string {
  const source = String(rawTargetUser || '').trim()
  if (!source) return ''
  const mention = source.match(/^<at\b[^>]*\bid="([^"]+)"[^>]*\/?\s*>$/i)
  if (mention?.[1]) return mention[1].trim()
  return /^[^\s<>]+$/.test(source) ? source : ''
}

function getSelfId(session: Session): string {
  return session.selfId || session.bot?.selfId || ''
}

function requesterId(session: Session): string {
  return [session.platform, getSelfId(session), session.userId, session.channelId]
    .filter(Boolean)
    .join(':')
}

function maskIdentifier(value: string): string {
  if (value.length <= 8) return value
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

function formatWarning(data: { warning?: string; commandOutput?: string }): string {
  if (!data.warning) return ''
  return `\n注意：${data.warning}${data.commandOutput ? `\n${data.commandOutput}` : ''}`
}

function formatAllowlistResult(data: {
  allowlistSyncEnabled?: boolean
  warning?: string
  commandOutput?: string
}): string {
  const syncNotice = data.allowlistSyncEnabled === false
    ? '\n提示：BDS allowlist 同步已关闭，本次仅修改账号绑定'
    : ''
  return `${syncNotice}${formatWarning(data)}`
}

function quoteIfNeeded(session: Session, config: Config, text: string) {
  if (config.quoteCommandReplies && session.messageId) {
    return h('', [h.quote(session.messageId), h.text(text)])
  }
  return text
}
