export interface HealthResponse {
  status: string
  timestamp: number
  uptime: number
}

export interface StatusResponse {
  status: string
  plugin: string
  version: string
  playerCount: number
  bdsVersion: string
  protocolVersion: number
}

export interface ServerResponse {
  status: string
  levelName: string
  bdsVersion: string
  protocolVersion: number
  levilaminaVersion: string
  pluginVersion: string
  onlinePlayers: number
  maxPlayers: number
}

export interface PlayerInfo {
  name: string
  xuid: string
  uuid: string
}

export interface PlayersResponse {
  players: PlayerInfo[]
  count: number
}

export interface PlayersCountResponse {
  count: number
}

export interface PlayersNamesResponse {
  names: string[]
  count: number
}

export interface PlayerEnumValue {
  value: number
  name: string
}

export interface PlayerPosition {
  x: number
  y: number
  z: number
  dimensionId?: number
}

export interface PlayerBlockPosition {
  x: number
  y: number
  z: number
  dimensionId?: number
}

export interface PlayerItem {
  typeName: string
  displayName: string
  count: number
  enchanted: boolean
}

export interface PlayerResponse {
  name: string
  xuid: string
  uuid: string
  uniqueId: string
  locale: string
  permissionLevel: PlayerEnumValue
  isOperator: boolean
  isSimulated: boolean
  gameMode: PlayerEnumValue
  health: number
  maxHealth: number
  speed: number
  isFlying: boolean
  isSneaking: boolean
  isSprinting: boolean
  isMoving: boolean
  isInWater: boolean
  isInLava: boolean
  isOnGround: boolean
  isOnFire: boolean
  isSleeping: boolean
  isGliding: boolean
  isRiding: boolean
  isInvisible: boolean
  canFly: boolean
  canSleep: boolean
  position: PlayerPosition
  blockPosition: PlayerBlockPosition
  feetPosition: PlayerPosition
  lastDeathPosition: PlayerBlockPosition | null
  respawnPosition: PlayerBlockPosition | null
  rotation: { pitch: number; yaw: number }
  biome: { id: number; name: string } | null
  standingOn: { typeName: string; descriptionId: string } | null
  expNeededForNextLevel: number
  mainHand: PlayerItem | null
  offHand: PlayerItem | null
  armor: Array<{ slot: string; item: PlayerItem }>
  device: {
    platform: PlayerEnumValue
    inputMode: PlayerEnumValue | null
  }
  network: {
    currentPingMs: number
    averagePingMs: number
    currentPacketLoss: number
    averagePacketLoss: number
  } | null
  snapshotAtMs: number
}

export interface TpsSnapshot {
  realtime: number
  avg10s: number
  avg60s: number
  avg300s: number
  sampledSeconds: number
}

export interface OverviewResponse {
  status: 'online'
  timestamp: number
  uptimeMs: number
  tps: TpsSnapshot
  players: {
    online: number
    max: number
    names: string[]
  }
  versions: {
    bds: string
    protocol: number
    levilamina: string
    plugin: string
  }
}

export interface HistoricalPlayer {
  xuid: string
  uuid: string
  name: string
  firstSeenMs: number
  lastSeenMs: number
  totalPlayMs: number
  joinCount: number
  blocksMined: number
  mobsKilled: number
  money: number | null
  moneyAvailable: boolean
}

export interface PlayerHistoryResponse {
  total: number
  page: number
  pageSize: number
  pageCount: number
  players: HistoricalPlayer[]
}

export type PlayerStatsResponse = HistoricalPlayer

export interface WhitelistBinding {
  platform: string
  selfId: string
  userId: string
  channelId: string
  playerName: string
  xuid: string
  boundAtMs: number
}

export interface AllowlistOperation {
  operation: 'add' | 'remove'
  playerName: string
  success: boolean
  timedOut: boolean
  output: string
}

export interface WhitelistBindingResponse {
  success: boolean
  created?: boolean
  forced?: boolean
  binding: WhitelistBinding
  replacedBindings?: Array<WhitelistBinding & {
    reason?: 'target_user_was_bound' | 'target_player_was_bound'
  }>
  allowlistSyncEnabled: boolean
  allowlistUpdated: boolean | null
  allowlistOperations: AllowlistOperation[]
  commandOutput: string
  warning?: string
}

export interface WhitelistStateResponse {
  success: boolean
  playerName: string
  bound: boolean
  binding: WhitelistBinding | null
}

export interface WhitelistRemovalResponse {
  success: boolean
  playerName: string
  binding: WhitelistBinding
  recordRemoved: true
  allowlistSyncEnabled: boolean
  allowlistUpdated: boolean | null
  allowlistOperations: AllowlistOperation[]
  commandOutput: string
  warning?: string
}

export interface CommandExecutionResponse {
  success: boolean
  timedOut: boolean
  command: string
  output: string
}
