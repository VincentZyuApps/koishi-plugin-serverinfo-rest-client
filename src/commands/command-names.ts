export const COMMAND_NAMES = {
  health: { primary: '健康检查', alias: 'health', emoji: '❤️' },
  online: { primary: '查在线', alias: 'online', emoji: '🌐' },
  history: { primary: '历史记录', alias: 'history', emoji: '📚' },
  playerData: { primary: '玩家历史统计', alias: 'player-stats', emoji: '📊' },
  executeCommand: { primary: '执行命令', alias: 'execute-command', emoji: '🛠️' },
  bindWhitelist: { primary: '绑定玩家', alias: 'bind-player', emoji: '🔗' },
  unbindWhitelist: { primary: '解绑玩家', alias: 'unbind-player', emoji: '🔓' },
  addWhitelist: { primary: '添加白名单', alias: 'add-whitelist', emoji: '➕' },
  whitelistBinding: { primary: '查询白名单绑定', alias: 'whitelist-binding', emoji: '🔎' },
  removeWhitelist: { primary: '移除白名单', alias: 'remove-whitelist', emoji: '➖' },
  status: { primary: '服务器状态', alias: 'status', emoji: '📊' },
  server: { primary: '服务器信息', alias: 'server', emoji: '🖥️' },
  players: { primary: '玩家列表', alias: 'players', emoji: '👥' },
  playersCount: { primary: '玩家数量', alias: 'players-count', emoji: '🔢' },
  playersNames: { primary: '玩家名列表', alias: 'players-names', emoji: '📝' },
  player: { primary: '玩家在线详情', alias: 'online-player', emoji: '👤' },
} as const

export type CommandName = (typeof COMMAND_NAMES)[keyof typeof COMMAND_NAMES]

export function primaryCommand(prefix: string, command: CommandName): string {
  return `${prefix}.${command.primary}`
}

export function aliasCommand(prefix: string, command: CommandName): string {
  return `${prefix}.${command.alias}`
}

export function commandUsage(prefix: string, command: CommandName, argument = ''): string {
  const suffix = argument ? ` ${argument}` : ''
  return `${primaryCommand(prefix, command)}${suffix} (${command.alias})`
}

export function commandDescription(command: CommandName, description: string): string {
  return `${command.emoji} ${description}（alias：${command.alias}）`
}
