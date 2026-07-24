import { describe, expect, it, vi } from 'vitest'
import {
  aliasCommand,
  COMMAND_NAMES,
  commandUsage,
  primaryCommand,
  registerCommands,
  resolveCommandScope,
} from '../src/commands'

function collectRegistrations(commandPrefix: string, useCommandPrefix = true) {
  const registrations: Array<{
    declaration: string
    primary: string
    description: string
    aliases: string[]
    action?: Function
  }> = []
  const ctx = {
    logger: { info: vi.fn() },
    command: vi.fn((declaration: string, description: string) => {
      const registration = {
        declaration,
        primary: declaration.split(' ')[0],
        description,
        aliases: [] as string[],
      }
      registrations.push(registration)
      const chain: any = {
        alias: vi.fn((name: string) => {
          registration.aliases.push(name)
          return chain
        }),
        option: vi.fn(() => chain),
        action: vi.fn((handler: Function) => {
          registration.action = handler
          return chain
        }),
      }
      return chain
    }),
  } as any
  const scope = resolveCommandScope(commandPrefix, useCommandPrefix)
  registerCommands({
    ctx,
    config: { whitelistBindingAuthority: 1 } as any,
    apiClient: {} as any,
    rootCommand: scope.rootCommand,
    prefix: scope.featurePrefix,
    label: '测试服务器',
  })
  return { registrations, scope }
}

describe('command registration', () => {
  it('registers the root command and every feature through the production entry', () => {
    const { registrations } = collectRegistrations('mcinfo1')
    const [root, ...features] = registrations
    const expected = Object.values(COMMAND_NAMES).map(command => ({
      primary: primaryCommand('mcinfo1', command),
      aliases: [aliasCommand('mcinfo1', command)],
    }))

    expect(root).toMatchObject({ primary: 'mcinfo1', aliases: [] })
    const help = root.action!()
    expect(help.attrs.content).toContain('mcinfo1.健康检查 (health-check)')
    expect(help.attrs.content).toContain('mcinfo1.玩家在线详情 <玩家名> (player-details)')
    expect(features.map(({ primary, aliases }) => ({ primary, aliases }))).toEqual(expected)
    expect(new Set(expected.map(({ primary }) => primary)).size).toBe(expected.length)
    expect(new Set(expected.flatMap(({ aliases }) => aliases)).size).toBe(expected.length)
    Object.values(COMMAND_NAMES).forEach((command, index) => {
      expect(features[index].description).toContain(`（alias：${command.alias}）`)
      expect(features[index].description).toContain(command.emoji)
      expect(command.alias).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/)
    })
    expect(commandUsage('mcinfo1', COMMAND_NAMES.playerDetails, '<玩家名>'))
      .toBe('mcinfo1.玩家在线详情 <玩家名> (player-details)')
    expect(aliasCommand('mcinfo1', COMMAND_NAMES.serverStatus)).toBe('mcinfo1.server-status')
  })

  it('keeps the configured root while registering top-level feature commands', () => {
    const { registrations, scope } = collectRegistrations('mcinfo2', false)
    const [root, ...features] = registrations
    const expected = Object.values(COMMAND_NAMES).map(command => ({
      primary: primaryCommand('', command),
      aliases: [aliasCommand('', command)],
    }))

    expect(scope).toEqual({ rootCommand: 'mcinfo2', featurePrefix: '' })
    expect(root).toMatchObject({ primary: 'mcinfo2', aliases: [] })
    expect(features.map(({ primary, aliases }) => ({ primary, aliases }))).toEqual(expected)
    expect(features.every(({ primary, aliases }) => (
      !primary.startsWith('mcinfo2.') && aliases.every(alias => !alias.startsWith('mcinfo2.'))
    ))).toBe(true)
    expect(commandUsage('', COMMAND_NAMES.playerDetails, '<玩家名>'))
      .toBe('玩家在线详情 <玩家名> (player-details)')
    expect(aliasCommand('', COMMAND_NAMES.serverStatus)).toBe('server-status')
  })

  it('falls back to mcinfo1 for an empty root command and keeps prefixes enabled by default', () => {
    expect(resolveCommandScope('', undefined)).toEqual({
      rootCommand: 'mcinfo1',
      featurePrefix: 'mcinfo1',
    })
  })
})
