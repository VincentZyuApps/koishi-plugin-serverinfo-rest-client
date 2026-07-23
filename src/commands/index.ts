import { registerButtonMenuCommand } from './button-menu'
import { registerExecuteCommand } from './execute-command'
import { registerHealthCheckCommand } from './health-check'
import { registerPlayerCountCommand } from './player-count'
import { registerPlayerDetailsCommand } from './player-details'
import { registerPlayerHistoryCommand } from './player-history'
import { registerPlayerListCommand } from './player-list'
import { registerPlayerNamesCommand } from './player-names'
import { registerPlayerStatisticsCommand } from './player-statistics'
import { registerRootCommand } from './root-command'
import { registerServerDetailsCommand } from './server-details'
import { registerServerOverviewCommand } from './server-overview'
import { registerServerStatusCommand } from './server-status'
import { registerWhitelistCommands } from './whitelist'
import type { CommandRegistrationContext } from './types'

export * from './command-names'
export type { CommandRegistrationContext } from './types'

export function registerCommands(registration: CommandRegistrationContext) {
  registerRootCommand(registration)
  registerButtonMenuCommand(registration)
  registerHealthCheckCommand(registration)
  registerServerOverviewCommand(registration)
  registerPlayerHistoryCommand(registration)
  registerPlayerStatisticsCommand(registration)
  registerExecuteCommand(registration)
  registerWhitelistCommands(registration)
  registerServerStatusCommand(registration)
  registerServerDetailsCommand(registration)
  registerPlayerListCommand(registration)
  registerPlayerCountCommand(registration)
  registerPlayerNamesCommand(registration)
  registerPlayerDetailsCommand(registration)
}
