import type { CommandRegistrationContext } from '../types'
import { registerAddWhitelistCommand } from './add-whitelist'
import { registerBindPlayerCommand } from './bind-player'
import { registerRemoveWhitelistCommand } from './remove-whitelist'
import { registerUnbindPlayerCommand } from './unbind-player'
import { registerWhitelistBindingCommand } from './whitelist-binding'

export { parseTargetUserId } from './shared'

export function registerWhitelistCommands(registration: CommandRegistrationContext) {
  registerBindPlayerCommand(registration)
  registerUnbindPlayerCommand(registration)
  registerAddWhitelistCommand(registration)
  registerWhitelistBindingCommand(registration)
  registerRemoveWhitelistCommand(registration)
}
