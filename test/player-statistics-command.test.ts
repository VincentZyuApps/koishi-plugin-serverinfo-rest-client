import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '../src/api/client'

const mocks = vi.hoisted(() => ({
  renderTypstTemplate: vi.fn(),
  sendRenderedReply: vi.fn(),
}))

vi.mock('../src/index', () => ({
  renderTypstTemplate: mocks.renderTypstTemplate,
}))

vi.mock('../src/qq', () => ({
  buildCommandKeyboard: vi.fn(() => []),
  escapeMarkdown: (value: string) => value,
  sendRenderedReply: mocks.sendRenderedReply,
}))

import { registerPlayerDataCommand } from '../src/commands/player-statistics'

const playerStats = {
  xuid: 'xuid-1',
  uuid: 'uuid-1',
  name: 'Steve',
  firstSeenMs: 1000,
  lastSeenMs: 2000,
  totalPlayMs: 60_000,
  joinCount: 2,
  blocksMined: 3,
  mobsKilled: 4,
  money: null,
  moneyAvailable: false,
}

function createHarness(configOverrides: Record<string, unknown> = {}, prefix = 'mcinfo1') {
  let action: Function | undefined
  const ctx = {
    command: vi.fn((declaration: string) => {
      expect(declaration).toBe(`${prefix ? `${prefix}.` : ''}玩家数据统计 [playerName:text]`)
      const chain: any = {
        alias: vi.fn(() => chain),
        action: vi.fn((handler: Function) => {
          action = handler
          return chain
        }),
      }
      return chain
    }),
  } as any
  const api = { get: vi.fn(), post: vi.fn() } as any
  const config = {
    adminToken: 'admin-token',
    serverLabel: '测试服',
    ...configOverrides,
  } as any
  const logger = { error: vi.fn() }
  registerPlayerDataCommand(ctx, config, api, logger, prefix)
  return { action: action!, api, logger }
}

const session = {
  platform: 'qq',
  selfId: 'bot-1',
  userId: 'user-1',
  bot: { selfId: 'bot-1' },
} as any

beforeEach(() => {
  vi.clearAllMocks()
  mocks.renderTypstTemplate.mockResolvedValue(Buffer.from('png'))
  mocks.sendRenderedReply.mockImplementation((_ctx, _session, _config, output) => output.text)
})

describe('player statistics command', () => {
  it('queries the current chat account binding when playerName is omitted', async () => {
    const { action, api } = createHarness()
    api.post.mockResolvedValue(playerStats)

    const result = await action({ session })

    expect(api.post).toHaveBeenCalledWith('/players/stats/bound', {
      platform: 'qq', selfId: 'bot-1', userId: 'user-1',
    }, true)
    expect(api.get).not.toHaveBeenCalled()
    expect(result).toContain('玩家数据：Steve')
  })

  it('queries an explicitly specified player without resolving a binding', async () => {
    const { action, api } = createHarness()
    api.get.mockResolvedValue(playerStats)

    await action({ session }, ' Steve ')

    expect(api.get).toHaveBeenCalledWith('/players/stats', { name: 'Steve' })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('prompts an unbound user to bind or specify a player', async () => {
    const { action, api } = createHarness()
    api.post.mockRejectedValue(new ApiRequestError(404, 'not bound', {
      code: 'binding_not_found',
    }))

    const result = await action({ session })

    expect(result).toContain('你还没有绑定 Xbox 玩家名')
    expect(result).toContain('mcinfo1.绑定玩家 <玩家名>')
    expect(result).toContain('mcinfo1.玩家数据统计 <玩家名>')
  })

  it('distinguishes a bound player without historical statistics', async () => {
    const { action, api } = createHarness()
    api.post.mockRejectedValue(new ApiRequestError(404, 'stats not found', {
      code: 'bound_player_stats_not_found',
      playerName: 'Alex',
    }))

    const result = await action({ session })

    expect(result).toContain('你绑定的玩家 Alex 暂无历史数据')
    expect(result).toContain('至少需要进入服务器一次')
  })

  it('uses top-level commands in binding guidance when prefixes are disabled', async () => {
    const { action, api } = createHarness({}, '')
    api.post.mockRejectedValue(new ApiRequestError(404, 'not bound', {
      code: 'binding_not_found',
    }))

    const result = await action({ session })

    expect(result).toContain('请先使用：绑定玩家 <玩家名>')
    expect(result).toContain('也可以使用：玩家数据统计 <玩家名>')
    expect(result).not.toContain('mcinfo1.')
  })
})
