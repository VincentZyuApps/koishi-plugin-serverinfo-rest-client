import { h } from 'koishi'
import { COMMAND_NAMES, commandUsage } from './command-names'
import type { CommandRegistrationContext } from './types'

export function registerRootCommand({ ctx, rootCommand, prefix, label }: CommandRegistrationContext) {
  ctx.command(rootCommand, `🎮 ${label} Minecraft BDS 服务器信息查询`)
    .action(() => h.text(`🎮 ${label} Minecraft BDS 服务器信息查询

使用以下功能指令查询服务器信息：
• ${commandUsage(prefix, COMMAND_NAMES.healthCheck)} - 健康检查
• ${commandUsage(prefix, COMMAND_NAMES.serverOverview)} - 查询服务器在线状态
• ${commandUsage(prefix, COMMAND_NAMES.playerHistory, '[页码]')} - 查询历史玩家
• ${commandUsage(prefix, COMMAND_NAMES.playerStatistics, '[玩家名]')} - 查询自己或指定玩家的历史游玩与统计数据
• ${commandUsage(prefix, COMMAND_NAMES.bindPlayer, '<玩家名>')} - 绑定聊天账号与 Xbox 玩家；服务端启用 BDS allowlist 同步时同时更新进服名单
• ${commandUsage(prefix, COMMAND_NAMES.unbindPlayer)} - 解除当前账号的唯一绑定；服务端启用同步时同时移除 BDS allowlist 项目
• ${commandUsage(prefix, COMMAND_NAMES.addWhitelist, '<玩家名> <聊天用户>')} - 管理员代用户创建绑定；冲突时可使用 --force
• ${commandUsage(prefix, COMMAND_NAMES.whitelistBinding, '<玩家名>')} - 管理员查询玩家的绑定状态
• ${commandUsage(prefix, COMMAND_NAMES.removeWhitelist, '<玩家名>')} - 管理员移除玩家绑定；服务端启用同步时同时移除 BDS allowlist 项目
• ${commandUsage(prefix, COMMAND_NAMES.executeCommand, '<命令>')} - 管理员执行 BDS 命令
• ${commandUsage(prefix, COMMAND_NAMES.serverStatus)} - 服务器状态
• ${commandUsage(prefix, COMMAND_NAMES.serverDetails)} - 服务器详细信息
• ${commandUsage(prefix, COMMAND_NAMES.playerList)} - 玩家列表
• ${commandUsage(prefix, COMMAND_NAMES.playerCount)} - 玩家数量
• ${commandUsage(prefix, COMMAND_NAMES.playerNames)} - 玩家名列表
• ${commandUsage(prefix, COMMAND_NAMES.playerDetails, '<玩家名>')} - 查询在线玩家的实时状态与详情

查询类指令支持 --mode (text/image) 参数指定输出模式`))
}
