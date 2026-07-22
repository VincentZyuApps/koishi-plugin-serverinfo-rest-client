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

export interface PlayerResponse {
  name: string
  xuid: string
  uuid: string
  ipAndPort: string
  locale: string
  isOperator: boolean
  position: { x: number; y: number; z: number }
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

export interface WhitelistBindingResponse {
  success: boolean
  created?: boolean
  forced?: boolean
  binding: WhitelistBinding
  replacedBindings?: Array<WhitelistBinding & {
    reason?: 'target_user_was_bound' | 'target_player_was_bound'
  }>
  allowlistUpdated: boolean
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
  allowlistUpdated: boolean
  commandOutput: string
  warning?: string
}

export interface CommandExecutionResponse {
  success: boolean
  timedOut: boolean
  command: string
  output: string
}
