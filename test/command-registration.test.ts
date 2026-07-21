import { describe, expect, it, vi } from 'vitest'
import { registerExecuteCommand } from '../src/commands/command-execution'
import { aliasCommand, COMMAND_NAMES, commandUsage, primaryCommand } from '../src/commands/command-names'
import { registerHealthCommand } from '../src/commands/health-check'
import { registerPlayersCountCommand } from '../src/commands/player-count'
import { registerPlayerCommand } from '../src/commands/player-details'
import { registerHistoryCommand } from '../src/commands/player-history'
import { registerPlayersCommand } from '../src/commands/player-list'
import { registerPlayersNamesCommand } from '../src/commands/player-names'
import { registerPlayerDataCommand } from '../src/commands/player-statistics'
import { registerServerCommand } from '../src/commands/server-details'
import { registerOnlineCommand } from '../src/commands/server-overview'
import { registerStatusCommand } from '../src/commands/server-status'
import { registerWhitelistCommands } from '../src/commands/whitelist-commands'

describe('command registration', () => {
  it('uses Chinese primary names and English aliases for every subcommand', () => {
    const registrations: Array<{ primary: string; description: string; aliases: string[] }> = []
    const ctx = {
      command: vi.fn((declaration: string, description: string) => {
        const registration = { primary: declaration.split(' ')[0], description, aliases: [] as string[] }
        registrations.push(registration)
        const chain: any = {
          alias: vi.fn((name: string) => {
            registration.aliases.push(name)
            return chain
          }),
          option: vi.fn(() => chain),
          action: vi.fn(() => chain),
        }
        return chain
      }),
    } as any
    const config = { whitelistBindingAuthority: 1 } as any
    const apiClient = {} as any
    const logger = {} as any
    const prefix = 'mcinfo1'
    const label = '测试服务器'

    registerHealthCommand(ctx, config, apiClient, logger, prefix, label)
    registerOnlineCommand(ctx, config, apiClient, logger, prefix)
    registerHistoryCommand(ctx, config, apiClient, logger, prefix)
    registerPlayerDataCommand(ctx, config, apiClient, logger, prefix)
    registerExecuteCommand(ctx, config, apiClient, logger, prefix)
    registerWhitelistCommands(ctx, config, apiClient, logger, prefix)
    registerStatusCommand(ctx, config, apiClient, logger, prefix, label)
    registerServerCommand(ctx, config, apiClient, logger, prefix, label)
    registerPlayersCommand(ctx, config, apiClient, logger, prefix, label)
    registerPlayersCountCommand(ctx, config, apiClient, logger, prefix, label)
    registerPlayersNamesCommand(ctx, config, apiClient, logger, prefix, label)
    registerPlayerCommand(ctx, config, apiClient, logger, prefix, label)

    const expected = Object.values(COMMAND_NAMES).map((command) => ({
      primary: primaryCommand(prefix, command),
      aliases: [aliasCommand(prefix, command)],
    }))
    expect(registrations.map(({ primary, aliases }) => ({ primary, aliases }))).toEqual(expected)
    expect(new Set(expected.map(({ primary }) => primary)).size).toBe(expected.length)
    expect(new Set(expected.flatMap(({ aliases }) => aliases)).size).toBe(expected.length)
    Object.values(COMMAND_NAMES).forEach((command, index) => {
      expect(registrations[index].description).toContain(`（alias：${command.alias}）`)
      expect(command.emoji).toBeTruthy()
    })
    expect(commandUsage(prefix, COMMAND_NAMES.player, '<玩家名>'))
      .toBe('mcinfo1.查询玩家 <玩家名> (player)')
  })
})
