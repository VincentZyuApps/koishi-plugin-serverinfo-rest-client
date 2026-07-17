import { h, type Context, type Session } from 'koishi'
import type { ApiClient } from '../api/client'
import type { WhitelistBindingResponse, WhitelistManagementResponse } from '../api/types'
import type { Config } from '../config'
import { hasPermission } from '../permissions'

export function registerWhitelistCommands(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  ctx.command(`${prefix}.绑定白名单 <playerName:text>`, '绑定 Minecraft 白名单', {
    authority: config.whitelistBindingAuthority,
  })
    .action(async ({ session }, rawPlayerName) => {
      if (config.whitelistBindGroupOnly && session.isDirect) return '绑定白名单只能在群聊中使用'
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请提供 Xbox 玩家名，例如：${prefix}.绑定白名单 Steve`
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法绑定白名单'
      const selfId = session.selfId || session.bot?.selfId
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
        const warning = data.warning ? `\n注意：${data.warning}\n${data.commandOutput}` : ''
        return quoteIfNeeded(session, config, `${state}：${data.binding.playerName}${warning}`)
      } catch (error) {
        logger.error(`绑定白名单失败: ${error}`)
        return `绑定白名单失败：${error instanceof Error ? error.message : String(error)}`
      }
    })

  ctx.command(`${prefix}.解绑`, '解除当前账号的普通白名单绑定（不撤销管理员直接授权）', {
    authority: config.whitelistBindingAuthority,
  })
    .alias(`${prefix}.解绑白名单`)
    .action(async ({ session }) => {
      if (config.whitelistUnbindGroupOnly && session.isDirect) return '解绑白名单只能在群聊中使用'
      if (!config.adminToken) return '尚未配置管理 API 令牌，无法解绑白名单'
      const selfId = session.selfId || session.bot?.selfId
      if (!selfId) return '无法识别当前 Bot 的 selfId，请检查适配器会话信息'
      try {
        const data = await apiClient.post<WhitelistBindingResponse>('/whitelist/unbind', {
          platform: session.platform,
          selfId,
          userId: session.userId,
        }, true)
        const retained = data.allowlistRetained ? '\n该玩家仍有管理员直接授权，服务器白名单已保留' : ''
        const warning = data.warning ? `\n注意：${data.warning}` : ''
        return quoteIfNeeded(session, config, `已解除 ${data.binding.playerName} 的白名单绑定${retained}${warning}`)
      } catch (error) {
        logger.error(`解绑白名单失败: ${error}`)
        return `解绑白名单失败：${error instanceof Error ? error.message : String(error)}`
      }
    })

  registerWhitelistManagementCommand(ctx, config, apiClient, logger, prefix, '添加白名单', 'add')
  registerWhitelistManagementCommand(ctx, config, apiClient, logger, prefix, '移除白名单', 'remove')
}

function registerWhitelistManagementCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
  commandName: '添加白名单' | '移除白名单',
  endpoint: 'add' | 'remove',
) {
  ctx.command(`${prefix}.${commandName} <playerName:text>`, `${commandName}中的 Minecraft 玩家`)
    .action(async ({ session }, rawPlayerName) => {
      if (!hasPermission(session, config.whitelistManagementAdminList)) {
        return '你不在白名单管理权限名单中'
      }
      const playerName = String(rawPlayerName || '').trim()
      if (!playerName) return `请提供 Xbox 玩家名，例如：${prefix}.${commandName} Steve`
      if (!config.adminToken) return `尚未配置管理 API 令牌，无法${commandName}`

      const selfId = session.selfId || session.bot?.selfId || ''
      const requester = [session.platform, selfId, session.userId, session.channelId]
        .filter(Boolean)
        .join(':')
      try {
        const data = await apiClient.post<WhitelistManagementResponse>(`/whitelist/${endpoint}`, {
          playerName,
          requester,
        }, true)
        const state = endpoint === 'add'
          ? (data.created ? '已添加白名单' : '白名单授权已存在')
          : (data.recordRemoved ? '已移除白名单及本地授权' : '已请求移除白名单')
        const commandOutput = data.commandOutput ? `\n服务端返回：${data.commandOutput}` : ''
        const warning = data.warning ? `\n注意：${data.warning}` : ''
        return quoteIfNeeded(session, config, `${state}：${data.playerName}${commandOutput}${warning}`)
      } catch (error) {
        logger.error(`${commandName}失败: ${error}`)
        return `${commandName}失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}

function quoteIfNeeded(session: Session, config: Config, text: string) {
  if (config.quoteCommandReplies && session.messageId) {
    return h('', [h.quote(session.messageId), h.text(text)])
  }
  return text
}
