import { Schema } from 'koishi'
import { getSchemaFontPath } from './font'
import { TEMPLATE_ASSET_PARTS } from './template'
import type { PermissionEntry } from './permissions'
import { createQQConfigSchema, QQConfig } from './qq/config'

/**
 * 输出模式类型
 */
export type OutputMode = 'text' | 'typst-image'
export type TokenSendMode = 'param' | 'header' | 'both'

export interface PlayerFieldFilter {
  key: string
  enabled: boolean
}

export const DEFAULT_PLAYER_FIELD_FILTERS: readonly PlayerFieldFilter[] = [
  { key: 'name', enabled: true },
  { key: 'xuid', enabled: true },
  { key: 'uuid', enabled: true },
  { key: 'uniqueId', enabled: false },
  { key: 'permissionLevel', enabled: true },
  { key: 'isOperator', enabled: true },
  { key: 'isSimulated', enabled: true },
  { key: 'locale', enabled: true },
  { key: 'gameMode', enabled: true },
  { key: 'health', enabled: true },
  { key: 'maxHealth', enabled: true },
  { key: 'speed', enabled: true },
  { key: 'isFlying', enabled: true },
  { key: 'isSneaking', enabled: true },
  { key: 'isSprinting', enabled: true },
  { key: 'isMoving', enabled: true },
  { key: 'isSwimming', enabled: true },
  { key: 'isInLava', enabled: true },
  { key: 'isOnGround', enabled: true },
  { key: 'isOnFire', enabled: true },
  { key: 'isSleeping', enabled: true },
  { key: 'isGliding', enabled: true },
  { key: 'isRiding', enabled: true },
  { key: 'isInvisible', enabled: true },
  { key: 'canFly', enabled: true },
  { key: 'canSleep', enabled: true },
  { key: 'position', enabled: false },
  { key: 'position.dimensionId', enabled: true },
  { key: 'blockPosition', enabled: false },
  { key: 'feetPosition', enabled: false },
  { key: 'lastDeathPosition', enabled: false },
  { key: 'respawnPosition', enabled: false },
  { key: 'rotation', enabled: false },
  { key: 'biome', enabled: true },
  { key: 'standingOn', enabled: true },
  { key: 'expNeededForNextLevel', enabled: true },
  { key: 'mainHand', enabled: false },
  { key: 'offHand', enabled: false },
  { key: 'armor', enabled: false },
  { key: 'device.platform', enabled: false },
  { key: 'device.inputMode', enabled: false },
  { key: 'network.currentPingMs', enabled: true },
  { key: 'network.averagePingMs', enabled: true },
  { key: 'network.currentPacketLoss', enabled: true },
  { key: 'network.averagePacketLoss', enabled: true },
  { key: 'snapshotAtMs', enabled: true },
]

/**
 * 插件配置接口
 */
export interface Config extends QQConfig {
  // ========== 🏷️ 指令与标识配置 ==========
  /** 主指令名称及可选的功能指令前缀 */
  commandPrefix: string
  /** 是否为功能指令使用前缀 */
  useCommandPrefix: boolean
  /** 服务器名称标记 */
  serverLabel: string

  // ========== 🔌 服务器连接配置 ==========
  /** REST 服务基础 URL */
  serverUrl: string
  /** 访问令牌 */
  token: string
  /** 只读访问令牌发送方式 */
  tokenSendMode: TokenSendMode
  /** 管理 API 访问令牌 */
  adminToken: string
  /** 管理 API 令牌发送方式 */
  adminTokenSendMode: TokenSendMode
  /** API 前缀 */
  apiPrefix: string
  /** 请求超时时间（毫秒） */
  timeout: number

  // ========== 🎯 指令细节设置 ==========
  /** 是否隐藏玩家坐标 */
  hidePlayerCoordinates: boolean
  /** 玩家信息字段过滤配置 */
  playerFieldFilters: PlayerFieldFilter[]
  /** 历史记录每页玩家数量 */
  historyPageSize: number
  /** 允许执行服务端命令的聊天账号 */
  commandExecutionAdminList: PermissionEntry[]
  /** 允许直接添加或移除白名单的聊天账号 */
  whitelistManagementAdminList: PermissionEntry[]
  /** 绑定玩家所需 Koishi 权限等级 */
  whitelistBindingAuthority: number
  /** 白名单绑定是否只允许群聊 */
  whitelistBindGroupOnly: boolean
  /** 解绑玩家是否只允许群聊 */
  whitelistUnbindGroupOnly: boolean

  // ========== 📤 输出配置 ==========
  /** 默认输出模式 */
  defaultOutputModes: OutputMode[]
  /** 指令触发的回复是否引用原消息 */
  quoteCommandReplies: boolean
  /** Typst 图片失败时是否回退到文字结果 */
  typstFallbackToText: boolean

  // ========== 🧩 Typst 渲染配置 ==========
  /** 是否自动下载并校验字体 */
  downloadFontsFromRelease: boolean
  /** Typst 字体路径 */
  typstFontPath: string
  /** Typst Emoji 字体路径 */
  typstEmojiFontPath: string
  /** Typst 字体族名称 */
  typstFontFamily: string
  /** Typst 运行时模板文件夹相对路径 */
  typstTemplateFolderRelativePath: string[]
  /** Typst 图片渲染倍率（清晰度） */
  typstRenderScale: number
  /** Typst 图片背景是否透明 */
  typstTransparentBackground: boolean
  /** Typst 背景色 */
  typstPageBgColor: string
  /** Typst 正文文本颜色 */
  typstTextColor: string
  /** Typst 标题栏填充色 */
  typstHeaderFillColor: string
  /** Typst 标题栏描边色 */
  typstHeaderStrokeColor: string
  /** Typst 标题栏文字颜色 */
  typstHeaderTextColor: string
  /** Typst 内容面板填充色 */
  typstPanelFillColor: string
  /** Typst 内容面板描边色 */
  typstPanelStrokeColor: string
  /** Typst 小节标题颜色 */
  typstSectionTitleColor: string
  /** Typst 统计信息文字颜色 */
  typstStatsTextColor: string

  // ========== 🛠️ 调试选项 ==========
  /** 启用详细调试日志 */
  verboseConsoleLog: boolean
}

// Schema 工厂函数：输出模式多选
function createOutputModeSchema() {
  return Schema.array(
    Schema.union([
      Schema.const('text' as const).description('📝 文字'),
      Schema.const('typst-image' as const).description('🧩 Typst 图片'),
    ])
  ).role('checkbox')
}

function createTokenSendModeSchema() {
  return Schema.union([
    Schema.const('param' as const).description('🔗 URL 参数（?token=...）'),
    Schema.const('header' as const).description('🛡️ Authorization Bearer 请求头'),
    Schema.const('both' as const).description('🔁 请求头和 URL 参数同时发送'),
  ]).role('radio')
}

function createPermissionListSchema() {
  return Schema.array(Schema.object({
    platform: Schema.string()
      .default('')
      .description('🏷️ 平台名称；留空表示不限制平台'),
    channelId: Schema.string()
      .default('')
      .description('💬 频道或群 ID；留空表示不限制会话'),
    selfId: Schema.string()
      .default('')
      .description('🤖 Bot 账号 selfId；留空表示不限制 Bot'),
    userId: Schema.string()
      .description('🆔 获得权限的用户 ID'),
    enabled: Schema.boolean()
      .default(true)
      .description('✅ 是否启用这一行'),
  })).role('table')
}

/**
 * 插件配置 Schema
 */
export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    commandPrefix: Schema.string()
      .default('mcinfo1')
      .description('🏷️ 主指令名称；useCommandPrefix 开启时也作为功能指令前缀，例如 mcinfo1.健康检查'),
    useCommandPrefix: Schema.boolean()
      .default(true)
      .description('🔗 是否为功能指令添加 commandPrefix 前缀；关闭后仍保留单独的主指令，但健康检查、health-check 等功能指令将注册为顶级指令，多实例或存在同名指令时建议保持开启'),
    serverLabel: Schema.string()
      .default('【神秘小服服1】')
      .description('🏷️ 服务器名称标记（显示在所有输出的标题中）'),
  }).description('🏷️ 指令与标识配置'),

  Schema.object({
    serverUrl: Schema.string()
      .default('http://127.0.0.1:60202')
      .description('🌐 REST 服务基础 URL（包含 http:// 或 https://、主机和端口）'),
    token: Schema.string()
      .default('')
      .role('secret')
      .description('🔑 访问令牌（如果服务器启用了 token 认证）'),
    tokenSendMode: createTokenSendModeSchema()
      .default('header')
      .description('📤🔑 只读 token 发送方式；需要与服务端 tokenReceiveMode 兼容，推荐使用 header'),
    adminToken: Schema.string()
      .default('')
      .role('secret')
      .description('🛡️ 管理 API 令牌（执行命令、绑定玩家和管理白名单使用，必须与服务端 adminToken 一致）'),
    adminTokenSendMode: createTokenSendModeSchema()
      .default('header')
      .description('📤🛡️ 管理 token 发送方式；需要与服务端 adminTokenReceiveMode 兼容，推荐保持 header'),
    apiPrefix: Schema.string()
      .default('/api/v2')
      .description('📡 API v2 前缀；必须与服务端一致'),
    timeout: Schema.number()
      .default(10000)
      .min(1000)
      .max(60000)
      .description('⏱️ 请求超时时间（毫秒）'),
  }).description('🔌 服务器连接配置'),

  Schema.object({
    hidePlayerCoordinates: Schema.boolean()
      .default(true)
      .description('🙈 是否隐藏“玩家在线详情”中的全部精确坐标；维度信息不受影响'),
    playerFieldFilters: Schema.array(
      Schema.object({
        key: Schema.string().description('API v2 字段路径（嵌套用英文句号分隔，如 position.dimensionId、network.averagePingMs）'),
        enabled: Schema.boolean().default(true).description('是否显示'),
      })
    )
      .role('table')
      .default(DEFAULT_PLAYER_FIELD_FILTERS.map(field => ({ ...field })))
      .description('🔧 “玩家在线详情”字段过滤；装备、平台、输入方式与精确坐标默认关闭'),
    historyPageSize: Schema.number()
      .min(1)
      .max(100)
      .step(1)
      .default(30)
      .description('📚 历史记录每张图片显示的玩家数量'),
    commandExecutionAdminList: createPermissionListSchema()
      .default([])
      .description('⚡ 执行命令权限名单；userId 精确匹配，platform、channelId、selfId 留空表示不限制'),
    whitelistManagementAdminList: createPermissionListSchema()
      .default([])
      .description('🛡️ 管理员代绑、查询或移除玩家绑定的权限名单；与执行命令名单相互独立'),
    whitelistBindingAuthority: Schema.number()
      .min(0)
      .max(5)
      .step(1)
      .default(1)
      .description('🪪 绑定玩家或解绑玩家所需的 Koishi 权限等级'),
    whitelistBindGroupOnly: Schema.boolean()
      .default(true)
      .description('👥 白名单绑定是否只允许在群聊中使用'),
    whitelistUnbindGroupOnly: Schema.boolean()
      .default(false)
      .description('👥 解绑玩家是否只允许在群聊中使用；默认允许私聊解绑'),
  }).description('🎯 指令细节设置'),

  Schema.object({
    defaultOutputModes: createOutputModeSchema()
      .default(['text'])
      .description('📤 默认输出模式（可多选，使用 --mode 参数可覆盖）'),
    quoteCommandReplies: Schema.boolean()
      .default(true)
      .description('💬 指令触发的回复是否引用原消息'),
    typstFallbackToText: Schema.boolean()
      .default(false)
      .description('📝 Typst 图片渲染失败时是否发送对应的完整文字结果'),
  }).description('📤 输出配置'),

  Schema.object({
    downloadFontsFromRelease: Schema.boolean()
      .default(true)
      .description('📥 是否从 Release 自动下载并校验 Typst 字体'),
    typstFontPath: Schema.string()
      .default(getSchemaFontPath('LXGW'))
      .role('textarea', { rows: [2, 5] })
      .description('🔤 Typst 中文字体路径，默认映射到 Koishi 数据目录'),
    typstEmojiFontPath: Schema.string()
      .default(getSchemaFontPath('NOTO_EMOJI'))
      .role('textarea', { rows: [2, 5] })
      .description('😀 Typst Emoji 字体路径，默认映射到 Koishi 数据目录'),
    typstFontFamily: Schema.string()
      .default('LXGW WenKai Mono')
      .description('🔤 Typst 字体族名称（必须与字体文件中的 family name 一致）'),
    typstTemplateFolderRelativePath: Schema.array(String)
      .role('table')
      .default([...TEMPLATE_ASSET_PARTS])
      .experimental()
      .disabled()
      .description('🧩 Typst 运行时模板文件夹相对路径；相对于 Koishi 根目录 ctx.baseDir，仅供查看'),
    typstRenderScale: Schema.number()
      .default(2.33)
      .min(1)
      .max(10)
      .step(0.01)
      .description('🔍 Typst 图片渲染倍率（调整输出图片分辨率）'),
    typstTransparentBackground: Schema.boolean()
      .default(false)
      .description('🪟 Typst 图片背景是否透明；关闭时使用下方背景色'),
    typstPageBgColor: Schema.string()
      .role('color')
      .default('#f2f6f1')
      .description('🧁 Typst 背景色'),
    typstTextColor: Schema.string()
      .role('color')
      .default('#26332b')
      .description('🖋️ Typst 正文文本颜色'),
    typstHeaderFillColor: Schema.string()
      .role('color')
      .default('#2c5e3b')
      .description('🎀 Typst 标题栏填充色'),
    typstHeaderStrokeColor: Schema.string()
      .role('color')
      .default('#7fa973')
      .description('🪄 Typst 标题栏描边色'),
    typstHeaderTextColor: Schema.string()
      .role('color')
      .default('#ffffff')
      .description('✨ Typst 标题栏文字颜色'),
    typstPanelFillColor: Schema.string()
      .role('color')
      .default('#ffffff')
      .description('📦 Typst 内容面板填充色'),
    typstPanelStrokeColor: Schema.string()
      .role('color')
      .default('#cbd9ce')
      .description('🧷 Typst 内容面板描边色'),
    typstSectionTitleColor: Schema.string()
      .role('color')
      .default('#2c5e3b')
      .description('🧭 Typst 小节标题颜色'),
    typstStatsTextColor: Schema.string()
      .role('color')
      .default('#66746b')
      .description('📊 Typst 统计信息文字颜色'),
  }).description('🧩 Typst 渲染配置'),

  createQQConfigSchema(),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 启用详细调试日志；包含 API 请求摘要、QQ 图片缓存路径与完整临时公网 URL，请勿公开粘贴生产日志'),
  }).description('🛠️ 调试选项'),
])
