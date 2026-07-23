import { describe, expect, it, vi } from 'vitest'
import { registerExecuteCommand } from '../src/commands/command-execution'
import {
  aliasCommand,
  COMMAND_NAMES,
  commandUsage,
  primaryCommand,
  resolveCommandScope,
} from '../src/commands/command-names'
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

function collectRegistrations(prefix: string) {
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

  return registrations
}

describe('command registration', () => {
  it('uses Chinese primary names and English aliases for every subcommand', () => {
    const prefix = 'mcinfo1'
    const registrations = collectRegistrations(prefix)

    const expected = Object.values(COMMAND_NAMES).map((command) => ({
      primary: primaryCommand(prefix, command),
      aliases: [aliasCommand(prefix, command)],
    }))
    expect(registrations.map(({ primary, aliases }) => ({ primary, aliases }))).toEqual(expected)
    expect(new Set(expected.map(({ primary }) => primary)).size).toBe(expected.length)
    expect(new Set(expected.flatMap(({ aliases }) => aliases)).size).toBe(expected.length)
    Object.values(COMMAND_NAMES).forEach((command, index) => {
      expect(registrations[index].description).toContain(`（alias：${command.alias}）`)
      expect(registrations[index].description).toContain(command.emoji)
      expect(command.emoji).toBeTruthy()
    })
    expect(commandUsage(prefix, COMMAND_NAMES.player, '<玩家名>'))
      .toBe('mcinfo1.玩家在线详情 <玩家名> (online-player)')
    expect(aliasCommand(prefix, COMMAND_NAMES.status)).toBe('mcinfo1.server-status')
  })

  it('keeps the configured root command while registering feature commands without a prefix', () => {
    const scope = resolveCommandScope('mcinfo2', false)
    const registrations = collectRegistrations(scope.featurePrefix)
    const expected = Object.values(COMMAND_NAMES).map((command) => ({
      primary: primaryCommand('', command),
      aliases: [aliasCommand('', command)],
    }))

    expect(scope).toEqual({ rootCommand: 'mcinfo2', featurePrefix: '' })
    expect(registrations.map(({ primary, aliases }) => ({ primary, aliases }))).toEqual(expected)
    expect(registrations.every(({ primary, aliases }) => (
      !primary.startsWith('mcinfo2.') && aliases.every(alias => !alias.startsWith('mcinfo2.'))
    ))).toBe(true)
    expect(commandUsage('', COMMAND_NAMES.player, '<玩家名>'))
      .toBe('玩家在线详情 <玩家名> (online-player)')
    expect(aliasCommand('', COMMAND_NAMES.status)).toBe('server-status')
  })

  it('falls back to mcinfo1 for an empty root command and keeps prefixes enabled by default', () => {
    expect(resolveCommandScope('', undefined)).toEqual({
      rootCommand: 'mcinfo1',
      featurePrefix: 'mcinfo1',
    })
  })
})
