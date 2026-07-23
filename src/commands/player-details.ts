import { Context, h } from 'koishi'
import { Config, DEFAULT_PLAYER_FIELD_FILTERS } from '../config'
import type { ApiClient } from '../api/client'
import type { PlayerBlockPosition, PlayerItem, PlayerPosition, PlayerResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import {
  resolveOutputModes,
  renderTypstTemplate,
  createTypstFailureOutput,
} from '../index'

interface PlayerDetailRow {
  label: string
  value: string
}

export interface PlayerDetailSection {
  title: string
  rows: PlayerDetailRow[]
}

const DEFAULT_FIELD_STATE = new Map(DEFAULT_PLAYER_FIELD_FILTERS.map(field => [field.key, field.enabled]))

const DIMENSION_NAMES: Record<number, string> = {
  0: '主世界',
  1: '下界',
  2: '末地',
}

const GAME_MODE_NAMES: Record<string, string> = {
  survival: '生存',
  creative: '创造',
  adventure: '冒险',
  spectator: '旁观',
  default: '世界默认',
  undefined: '未定义',
}

const PERMISSION_NAMES: Record<string, string> = {
  member: '成员',
  game_director: '游戏管理员',
  admin: '管理员',
  host: '主机',
  owner: '服主',
  internal: '内部',
}

const PLATFORM_NAMES: Record<string, string> = {
  desktop: '桌面端',
  pocket: '移动端',
  console: '主机端',
  set_top_box: '机顶盒',
}

const INPUT_MODE_NAMES: Record<string, string> = {
  mouse: '键鼠',
  touch: '触屏',
  gamepad: '手柄',
  motion_controller: '体感控制器',
  undefined: '未知',
}

const ARMOR_SLOT_NAMES: Record<string, string> = {
  head: '头部',
  chest: '胸部',
  legs: '腿部',
  feet: '脚部',
}

function isFieldEnabled(config: Config, key: string): boolean {
  const configured = config.playerFieldFilters?.find(field => field.key === key)
  return configured?.enabled ?? DEFAULT_FIELD_STATE.get(key) ?? false
}

function formatDimension(dimensionId?: number): string {
  if (dimensionId === undefined) return '未知'
  return `${DIMENSION_NAMES[dimensionId] ?? '未知维度'} (${dimensionId})`
}

function formatPosition(position: PlayerPosition | PlayerBlockPosition): string {
  return `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`
}

function formatBlockPosition(position: PlayerBlockPosition): string {
  return `${position.x}, ${position.y}, ${position.z}`
}

function formatItem(item: PlayerItem): string {
  const name = item.displayName || item.typeName
  return `${name} x${item.count}${item.enchanted ? '（附魔）' : ''}`
}

function formatPacketLoss(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

function addRow(rows: PlayerDetailRow[], enabled: boolean, label: string, value: unknown) {
  if (enabled) rows.push({ label, value: String(value) })
}

export function createPlayerDetailSections(player: PlayerResponse, config: Config): PlayerDetailSection[] {
  const sections: PlayerDetailSection[] = []
  const basic: PlayerDetailRow[] = []
  addRow(basic, isFieldEnabled(config, 'xuid'), 'XUID', player.xuid)
  addRow(basic, isFieldEnabled(config, 'uuid'), 'UUID', player.uuid)
  addRow(basic, isFieldEnabled(config, 'uniqueId'), '运行时 ID', player.uniqueId)
  addRow(
    basic,
    isFieldEnabled(config, 'permissionLevel'),
    '权限等级',
    PERMISSION_NAMES[player.permissionLevel.name] ?? `${player.permissionLevel.name} (${player.permissionLevel.value})`,
  )
  addRow(basic, isFieldEnabled(config, 'isOperator'), 'OP', player.isOperator ? '是' : '否')
  addRow(basic, isFieldEnabled(config, 'isSimulated'), '模拟玩家', player.isSimulated ? '是' : '否')
  addRow(basic, isFieldEnabled(config, 'locale'), '语言', player.locale || '未知')
  if (basic.length) sections.push({ title: '📋 基本信息', rows: basic })

  const game: PlayerDetailRow[] = []
  addRow(
    game,
    isFieldEnabled(config, 'gameMode'),
    '游戏模式',
    GAME_MODE_NAMES[player.gameMode.name] ?? `${player.gameMode.name} (${player.gameMode.value})`,
  )
  const showHealth = isFieldEnabled(config, 'health')
  const showMaxHealth = isFieldEnabled(config, 'maxHealth')
  if (showHealth || showMaxHealth) {
    const value = showHealth && showMaxHealth
      ? `${player.health}/${player.maxHealth}`
      : String(showHealth ? player.health : player.maxHealth)
    game.push({ label: showHealth ? '生命值' : '最大生命值', value })
  }
  addRow(game, isFieldEnabled(config, 'speed'), '移动速度', player.speed.toFixed(2))

  const activeStates = [
    ['isFlying', player.isFlying, '飞行'],
    ['isSneaking', player.isSneaking, '潜行'],
    ['isSprinting', player.isSprinting, '疾跑'],
    ['isMoving', player.isMoving, '移动中'],
    ['isInWater', player.isInWater, '水中'],
    ['isInLava', player.isInLava, '岩浆中'],
    ['isOnGround', player.isOnGround, '着地'],
    ['isOnFire', player.isOnFire, '着火'],
    ['isSleeping', player.isSleeping, '睡眠'],
    ['isGliding', player.isGliding, '滑翔'],
    ['isRiding', player.isRiding, '骑乘'],
    ['isInvisible', player.isInvisible, '隐身'],
  ] as const
  const visibleStateKeys = activeStates.filter(([key]) => isFieldEnabled(config, key))
  if (visibleStateKeys.length) {
    const states = visibleStateKeys.filter(([, active]) => active).map(([, , label]) => label)
    game.push({ label: '当前状态', value: states.join('、') || '普通' })
  }

  const abilities: string[] = []
  if (isFieldEnabled(config, 'canFly')) abilities.push(`可飞行：${player.canFly ? '是' : '否'}`)
  if (isFieldEnabled(config, 'canSleep')) abilities.push(`可睡眠：${player.canSleep ? '是' : '否'}`)
  if (abilities.length) game.push({ label: '能力', value: abilities.join('，') })
  if (game.length) sections.push({ title: '🎮 游戏状态', rows: game })

  const location: PlayerDetailRow[] = []
  addRow(
    location,
    isFieldEnabled(config, 'position.dimensionId'),
    '所在维度',
    formatDimension(player.position.dimensionId),
  )
  const showCoordinates = !config.hidePlayerCoordinates
  addRow(location, showCoordinates && isFieldEnabled(config, 'position'), '精确坐标', formatPosition(player.position))
  addRow(
    location,
    showCoordinates && isFieldEnabled(config, 'blockPosition'),
    '方块坐标',
    formatBlockPosition(player.blockPosition),
  )
  addRow(
    location,
    showCoordinates && isFieldEnabled(config, 'feetPosition'),
    '脚部坐标',
    formatPosition(player.feetPosition),
  )
  if (showCoordinates && isFieldEnabled(config, 'lastDeathPosition') && player.lastDeathPosition) {
    location.push({
      label: '上次死亡',
      value: `${formatBlockPosition(player.lastDeathPosition)}，${formatDimension(player.lastDeathPosition.dimensionId)}`,
    })
  }
  if (showCoordinates && isFieldEnabled(config, 'respawnPosition') && player.respawnPosition) {
    location.push({ label: '重生点', value: formatBlockPosition(player.respawnPosition) })
  }
  addRow(
    location,
    showCoordinates && isFieldEnabled(config, 'rotation'),
    '朝向',
    `俯仰 ${player.rotation.pitch.toFixed(1)}°，偏航 ${player.rotation.yaw.toFixed(1)}°`,
  )
  if (location.length) sections.push({ title: '📍 位置信息', rows: location })

  const environment: PlayerDetailRow[] = []
  if (isFieldEnabled(config, 'biome') && player.biome) {
    environment.push({ label: '生物群系', value: `${player.biome.name} (${player.biome.id})` })
  }
  if (isFieldEnabled(config, 'standingOn') && player.standingOn) {
    environment.push({ label: '脚下方块', value: player.standingOn.typeName || player.standingOn.descriptionId })
  }
  if (environment.length) sections.push({ title: '🌍 环境信息', rows: environment })

  const experience: PlayerDetailRow[] = []
  addRow(
    experience,
    isFieldEnabled(config, 'expNeededForNextLevel'),
    '升级所需经验',
    player.expNeededForNextLevel,
  )
  if (experience.length) sections.push({ title: '⭐ 经验信息', rows: experience })

  const equipment: PlayerDetailRow[] = []
  if (isFieldEnabled(config, 'mainHand') && player.mainHand) {
    equipment.push({ label: '主手', value: formatItem(player.mainHand) })
  }
  if (isFieldEnabled(config, 'offHand') && player.offHand) {
    equipment.push({ label: '副手', value: formatItem(player.offHand) })
  }
  if (isFieldEnabled(config, 'armor') && player.armor.length) {
    for (const entry of player.armor) {
      equipment.push({ label: ARMOR_SLOT_NAMES[entry.slot] ?? entry.slot, value: formatItem(entry.item) })
    }
  }
  if (equipment.length) sections.push({ title: '🎒 装备信息', rows: equipment })

  const connection: PlayerDetailRow[] = []
  addRow(
    connection,
    isFieldEnabled(config, 'device.platform'),
    '设备类型',
    PLATFORM_NAMES[player.device.platform.name] ?? player.device.platform.name,
  )
  if (isFieldEnabled(config, 'device.inputMode') && player.device.inputMode) {
    connection.push({
      label: '输入方式',
      value: INPUT_MODE_NAMES[player.device.inputMode.name] ?? player.device.inputMode.name,
    })
  }
  if (player.network) {
    addRow(connection, isFieldEnabled(config, 'network.currentPingMs'), '当前延迟', `${player.network.currentPingMs} ms`)
    addRow(connection, isFieldEnabled(config, 'network.averagePingMs'), '平均延迟', `${player.network.averagePingMs} ms`)
    addRow(
      connection,
      isFieldEnabled(config, 'network.currentPacketLoss'),
      '当前丢包率',
      formatPacketLoss(player.network.currentPacketLoss),
    )
    addRow(
      connection,
      isFieldEnabled(config, 'network.averagePacketLoss'),
      '平均丢包率',
      formatPacketLoss(player.network.averagePacketLoss),
    )
  }
  if (connection.length) sections.push({ title: '📶 连接状态', rows: connection })

  const metadata: PlayerDetailRow[] = []
  addRow(
    metadata,
    isFieldEnabled(config, 'snapshotAtMs'),
    '快照时间',
    new Date(player.snapshotAtMs).toLocaleString('zh-CN'),
  )
  if (metadata.length) sections.push({ title: '🕒 数据时间', rows: metadata })
  return sections
}

function formatTextOutput(player: PlayerResponse, config: Config, label: string): string {
  const title = isFieldEnabled(config, 'name')
    ? `${label} 👤 玩家在线详情：${player.name}`
    : `${label} 👤 玩家在线详情`
  const sections = createPlayerDetailSections(player, config)
  return [
    title,
    ...sections.flatMap(section => [
      '',
      section.title,
      ...section.rows.map(row => `${row.label}：${row.value}`),
    ]),
  ].join('\n')
}

function createTemplatePayload(player: PlayerResponse, config: Config, label: string) {
  return {
    label,
    name: isFieldEnabled(config, 'name') ? player.name : '在线玩家',
    sections: createPlayerDetailSections(player, config),
  }
}

export function registerPlayerCommand(ctx: Context, cfg: Config, apiClient: ApiClient, logger: any, prefix: string, label: string) {
  ctx.command(
    `${primaryCommand(prefix, COMMAND_NAMES.player)} <name:string>`,
    commandDescription(COMMAND_NAMES.player, '查询指定在线玩家的实时状态与详情'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.player))
    .option('mode', '-m <mode:string> 输出模式 (text/image)')
    .action(async ({ session, options }, name) => {
      if (!name) return `❌ 请指定玩家名称，例如: ${primaryCommand(prefix, COMMAND_NAMES.player)} Steve`
      try {
        const data = await apiClient.get<PlayerResponse>('/player', { name })
        const modes = resolveOutputModes(options.mode, cfg)
        const results: h[] = []
        for (const mode of modes) {
          if (mode === 'text') {
            results.push(h.text(formatTextOutput(data, cfg, label)))
          } else {
            try {
              const image = await renderTypstTemplate(ctx, cfg, logger, 'playerDetail', createTemplatePayload(data, cfg, label))
              results.push(h.image(image, 'image/png'))
            } catch (error) {
              const fallback = createTypstFailureOutput(error, cfg, modes, formatTextOutput(data, cfg, label))
              if (fallback) results.push(fallback)
            }
          }
        }
        if (cfg.quoteCommandReplies && session.messageId) return h('', [h.quote(session.messageId), ...results])
        return results
      } catch (error) {
        logger.error(`获取玩家在线详情失败: ${error}`)
        return `❌ 获取玩家在线详情失败: ${error instanceof Error ? error.message : String(error)}`
      }
    })
}
