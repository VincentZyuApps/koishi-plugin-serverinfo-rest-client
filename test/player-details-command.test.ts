import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PLAYER_FIELD_FILTERS } from '../src/config'
import type { PlayerResponse } from '../src/api/types'

const mocks = vi.hoisted(() => ({
  renderTypstTemplate: vi.fn(),
}))

vi.mock('../src/typst', () => ({
  resolveOutputModes: () => ['text'],
  renderTypstTemplate: mocks.renderTypstTemplate,
  createTypstFailureOutput: vi.fn(),
}))

import { createPlayerDetailSections, registerPlayerDetailsCommand } from '../src/commands/player-details'

const player: PlayerResponse = {
  name: 'Steve',
  xuid: 'xuid-1',
  uuid: 'uuid-1',
  uniqueId: '42',
  locale: 'zh_CN',
  permissionLevel: { value: 2, name: 'admin' },
  isOperator: true,
  isSimulated: false,
  gameMode: { value: 6, name: 'spectator' },
  health: 18,
  maxHealth: 20,
  speed: 4.25,
  isFlying: true,
  isSneaking: false,
  isSprinting: false,
  isMoving: true,
  isSwimming: false,
  isInLava: false,
  isOnGround: false,
  isOnFire: false,
  isSleeping: false,
  isGliding: false,
  isRiding: false,
  isInvisible: false,
  canFly: true,
  canSleep: false,
  position: { x: 1.5, y: 64, z: -2.5, dimensionId: 0 },
  blockPosition: { x: 1, y: 64, z: -3, dimensionId: 0 },
  feetPosition: { x: 1.5, y: 63.4, z: -2.5, dimensionId: 0 },
  lastDeathPosition: null,
  respawnPosition: null,
  rotation: { pitch: 10, yaw: 20 },
  biome: { id: 1, name: 'plains' },
  standingOn: { typeName: 'minecraft:grass_block', descriptionId: 'tile.grass' },
  expNeededForNextLevel: 12,
  mainHand: { typeName: 'minecraft:diamond_pickaxe', displayName: '钻石镐', count: 1, enchanted: true },
  offHand: null,
  armor: [{
    slot: 'head',
    item: { typeName: 'minecraft:diamond_helmet', displayName: '钻石头盔', count: 1, enchanted: false },
  }],
  device: {
    platform: { value: 0, name: 'desktop' },
    inputMode: { value: 1, name: 'mouse' },
  },
  network: { currentPingMs: 12, averagePingMs: 15, currentPacketLoss: 0.01, averagePacketLoss: 0.02 },
  snapshotAtMs: Date.UTC(2026, 6, 23, 3, 0, 0),
}

function createConfig(overrides: Record<string, unknown> = {}) {
  return {
    hidePlayerCoordinates: true,
    playerFieldFilters: DEFAULT_PLAYER_FIELD_FILTERS.map(field => ({ ...field })),
    quoteCommandReplies: false,
    ...overrides,
  } as any
}

function flattenRows(config = createConfig()) {
  return createPlayerDetailSections(player, config).flatMap(section => section.rows)
}

beforeEach(() => vi.clearAllMocks())

describe('player online details', () => {
  it('uses only API v2 preset keys and excludes sensitive identifiers', () => {
    const keys = DEFAULT_PLAYER_FIELD_FILTERS.map(field => field.key)

    expect(keys).toContain('isOperator')
    expect(keys).toContain('position.dimensionId')
    expect(keys).toContain('network.averagePingMs')
    expect(keys).not.toContain('isOP')
    expect(keys).not.toContain('langCode')
    expect(keys).not.toContain('pos')
    expect(keys.some(key => /ip|clientId|serverAddress/i.test(key))).toBe(false)
  })

  it('uses API v2 fields and hides coordinates, equipment, and device details by default', () => {
    const rows = flattenRows()
    const labels = rows.map(row => row.label)

    expect(rows).toContainEqual({ label: '游戏模式', value: '旁观' })
    expect(rows).toContainEqual({ label: '生命值', value: '18/20' })
    expect(rows).toContainEqual({ label: '所在维度', value: '主世界 (0)' })
    expect(rows).toContainEqual({ label: '平均延迟', value: '15 ms' })
    expect(labels).not.toContain('精确坐标')
    expect(labels).not.toContain('主手')
    expect(labels).not.toContain('头部')
    expect(labels).not.toContain('设备类型')
    expect(labels).not.toContain('输入方式')
  })

  it('shows explicitly enabled coordinate, equipment, and device fields', () => {
    const enabled = new Set(['position', 'mainHand', 'armor', 'device.platform', 'device.inputMode'])
    const config = createConfig({
      hidePlayerCoordinates: false,
      playerFieldFilters: DEFAULT_PLAYER_FIELD_FILTERS.map(field => ({
        ...field,
        enabled: enabled.has(field.key) ? true : field.enabled,
      })),
    })
    const rows = flattenRows(config)

    expect(rows).toContainEqual({ label: '精确坐标', value: '1.5, 64.0, -2.5' })
    expect(rows).toContainEqual({ label: '主手', value: '钻石镐 x1（附魔）' })
    expect(rows).toContainEqual({ label: '头部', value: '钻石头盔 x1' })
    expect(rows).toContainEqual({ label: '设备类型', value: '桌面端' })
    expect(rows).toContainEqual({ label: '输入方式', value: '键鼠' })
  })

  it('ignores obsolete JavaScript-server field names and uses v2 defaults', () => {
    const rows = flattenRows(createConfig({
      playerFieldFilters: [
        { key: 'isOP', enabled: false },
        { key: 'langCode', enabled: false },
        { key: 'pos', enabled: true },
      ],
    }))

    expect(rows).toContainEqual({ label: 'OP', value: '是' })
    expect(rows).toContainEqual({ label: '语言', value: 'zh_CN' })
    expect(rows.map(row => row.label)).not.toContain('精确坐标')
  })

  it('queries GET /player for the existing player online details command', async () => {
    let action: Function | undefined
    const ctx = {
      logger: { info: vi.fn() },
      command: vi.fn(() => {
        const chain: any = {
          alias: vi.fn(() => chain),
          option: vi.fn(() => chain),
          action: vi.fn((handler: Function) => {
            action = handler
            return chain
          }),
        }
        return chain
      }),
    } as any
    const api = { get: vi.fn().mockResolvedValue(player) } as any
    registerPlayerDetailsCommand({
      ctx,
      config: createConfig(),
      apiClient: api,
      rootCommand: 'mcinfo1',
      prefix: 'mcinfo1',
      label: '测试服',
    })

    const result = await action!({ session: {}, options: {} }, 'Steve')

    expect(api.get).toHaveBeenCalledWith('/player', { name: 'Steve' })
    expect(result[0].attrs.content).toContain('玩家在线详情：Steve')
  })
})
