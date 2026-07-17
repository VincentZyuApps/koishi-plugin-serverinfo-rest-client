import { Schema } from 'koishi'
import { DEFAULT_FONT_RELEASE_URLS, getSchemaFontPath } from './font'
import type { PermissionEntry } from './permissions'
import { createQQConfigSchema, QQConfig } from './qq/config'

/**
 * 输出模式类型
 */
export type OutputMode = 'text' | 'typst-image'

/**
 * 插件配置接口
 */
export interface Config extends QQConfig {
  // ========== 🏷️ 指令与标识配置 ==========
  /** 指令前缀 */
  commandPrefix: string
  /** 服务器名称标记 */
  serverLabel: string

  // ========== 🔌 服务器连接配置 ==========
  /** REST 服务基础 URL */
  serverUrl: string
  /** 访问令牌 */
  token: string
  /** 管理 API 访问令牌 */
  adminToken: string
  /** API 前缀 */
  apiPrefix: string
  /** 请求超时时间（毫秒） */
  timeout: number

  // ========== 🎯 指令细节设置 ==========
  /** 是否隐藏玩家坐标 */
  hidePlayerCoordinates: boolean
  /** 玩家信息字段过滤配置 */
  playerFieldFilters: { key: string; enabled: boolean }[]
  /** 历史记录每页玩家数量 */
  historyPageSize: number
  /** 允许执行服务端命令的聊天账号 */
  commandExecutionAdminList: PermissionEntry[]
  /** 允许直接添加或移除白名单的聊天账号 */
  whitelistManagementAdminList: PermissionEntry[]
  /** 绑定白名单所需 Koishi 权限等级 */
  whitelistBindingAuthority: number
  /** 白名单绑定是否只允许群聊 */
  whitelistBindGroupOnly: boolean
  /** 白名单解绑是否只允许群聊 */
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
  /** 霞鹜文楷字体下载地址 */
  lxgwFontReleaseUrl: string
  /** Noto Color Emoji 字体下载地址 */
  notoEmojiFontReleaseUrl: string
  /** Typst 字体路径 */
  typstFontPath: string
  /** Typst Emoji 字体路径 */
  typstEmojiFontPath: string
  /** Typst 字体族名称 */
  typstFontFamily: string
  /** Typst 图片渲染倍率（清晰度） */
  typstRenderScale: number
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
  /** 启用调试日志 */
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
      .description('🏷️ 指令前缀（用于区分多实例，如 mcinfo1、mcinfo2）'),
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
    adminToken: Schema.string()
      .default('')
      .role('secret')
      .description('🛡️ 管理 API 令牌（执行命令、绑定白名单使用，必须与服务端 adminToken 一致）'),
    apiPrefix: Schema.string()
      .default('/api/v1')
      .description('📡 API 前缀'),
    timeout: Schema.number()
      .default(10000)
      .min(1000)
      .max(60000)
      .description('⏱️ 请求超时时间（毫秒）'),
  }).description('🔌 服务器连接配置'),

  Schema.object({
    hidePlayerCoordinates: Schema.boolean()
      .default(true)
      .description('🙈 是否隐藏玩家坐标（players 指令中不显示具体坐标）'),
    playerFieldFilters: Schema.array(
      Schema.object({
        key: Schema.string().description('字段路径（嵌套用英文句号分隔，如 pos.x、device.ip）'),
        enabled: Schema.boolean().default(true).description('是否显示'),
      })
    )
      .role('table')
      .default([
        // 📋 基本信息 - 一般可以展示
        { key: 'name', enabled: true },
        { key: 'xuid', enabled: true },
        { key: 'uuid', enabled: true },
        { key: 'uniqueId', enabled: false },
        { key: 'permLevel', enabled: true },
        { key: 'isOP', enabled: true },
        { key: 'isSimulatedPlayer', enabled: true },
        { key: 'langCode', enabled: true },
        // 🎮 游戏状态
        { key: 'gameMode', enabled: true },
        { key: 'health', enabled: true },
        { key: 'maxHealth', enabled: true },
        { key: 'speed', enabled: true },
        { key: 'isFlying', enabled: true },
        { key: 'isSneaking', enabled: true },
        { key: 'isSprinting', enabled: true },
        { key: 'isMoving', enabled: true },
        { key: 'isInAir', enabled: true },
        { key: 'isInWater', enabled: true },
        { key: 'isInLava', enabled: true },
        { key: 'isOnGround', enabled: true },
        { key: 'isOnFire', enabled: true },
        { key: 'isSleeping', enabled: true },
        { key: 'isGliding', enabled: true },
        { key: 'isRiding', enabled: true },
        { key: 'isInvisible', enabled: true },
        { key: 'isHungry', enabled: true },
        { key: 'canFly', enabled: true },
        { key: 'canSleep', enabled: true },
        { key: 'canPickupItems', enabled: true },
        // 📍 位置信息 - 隐私敏感，默认隐藏坐标细节
        { key: 'pos', enabled: false },
        { key: 'pos.dimId', enabled: true },
        { key: 'blockPos', enabled: false },
        { key: 'feetPos', enabled: false },
        { key: 'lastDeathPos', enabled: false },
        { key: 'respawnPos', enabled: false },
        { key: 'direction', enabled: false },
        // 🌍 环境信息
        { key: 'biome', enabled: true },
        { key: 'biome.id', enabled: false },
        { key: 'biome.name', enabled: true },
        { key: 'standingOn', enabled: true },
        { key: 'standingOn.type', enabled: false },
        { key: 'standingOn.name', enabled: true },
        // ⭐ 经验信息
        { key: 'level', enabled: true },
        { key: 'currentExp', enabled: true },
        { key: 'totalExp', enabled: true },
        { key: 'expNeededForNextLevel', enabled: true },
        // 🎒 物品信息
        { key: 'handItem', enabled: true },
        { key: 'offHandItem', enabled: true },
        { key: 'armor', enabled: true },
        { key: 'tags', enabled: true },
        // 📱 设备信息 - 高度隐私，默认隐藏
        { key: 'device', enabled: false },
        { key: 'device.ip', enabled: false },
        { key: 'device.os', enabled: true },
        { key: 'device.clientId', enabled: false },
        { key: 'device.inputMode', enabled: true },
        { key: 'device.serverAddress', enabled: false },
        { key: 'device.avgPing', enabled: true },
        { key: 'device.avgPacketLoss', enabled: true },
        { key: 'device.lastPing', enabled: true },
        { key: 'device.lastPacketLoss', enabled: true },
      ])
      .description('🔧 玩家信息字段过滤（控制 player 子指令显示哪些字段）'),
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
      .description('🛡️ 添加或移除白名单权限名单；与执行命令名单相互独立'),
    whitelistBindingAuthority: Schema.number()
      .min(0)
      .max(5)
      .step(1)
      .default(1)
      .description('🪪 绑定或解绑白名单所需的 Koishi 权限等级'),
    whitelistBindGroupOnly: Schema.boolean()
      .default(true)
      .description('👥 白名单绑定是否只允许在群聊中使用'),
    whitelistUnbindGroupOnly: Schema.boolean()
      .default(false)
      .description('👥 白名单解绑是否只允许在群聊中使用；默认允许私聊解绑'),
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
    lxgwFontReleaseUrl: Schema.string()
      .default(DEFAULT_FONT_RELEASE_URLS.LXGW)
      .role('textarea', { rows: [2, 5] })
      .description('🔤 霞鹜文楷 Mono 字体下载地址，失败后自动尝试备用镜像'),
    notoEmojiFontReleaseUrl: Schema.string()
      .default(DEFAULT_FONT_RELEASE_URLS.NOTO_EMOJI)
      .role('textarea', { rows: [2, 5] })
      .description('😀 Noto Color Emoji 字体下载地址，失败后自动尝试备用镜像'),
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
    typstRenderScale: Schema.number()
      .default(2.33)
      .min(1)
      .max(10)
      .step(0.01)
      .description('🔍 Typst 图片渲染倍率（调整输出图片分辨率）'),
    typstPageBgColor: Schema.string()
      .role('color')
      .default('#f9efe2')
      .description('🧁 Typst 背景色'),
    typstTextColor: Schema.string()
      .role('color')
      .default('#2f2f35')
      .description('🖋️ Typst 正文文本颜色'),
    typstHeaderFillColor: Schema.string()
      .role('color')
      .default('#5dade2')
      .description('🎀 Typst 标题栏填充色'),
    typstHeaderStrokeColor: Schema.string()
      .role('color')
      .default('#3498db')
      .description('🪄 Typst 标题栏描边色'),
    typstHeaderTextColor: Schema.string()
      .role('color')
      .default('#ffffff')
      .description('✨ Typst 标题栏文字颜色'),
    typstPanelFillColor: Schema.string()
      .role('color')
      .default('#fffbf8')
      .description('📦 Typst 内容面板填充色'),
    typstPanelStrokeColor: Schema.string()
      .role('color')
      .default('#f3efe5')
      .description('🧷 Typst 内容面板描边色'),
    typstSectionTitleColor: Schema.string()
      .role('color')
      .default('#2980b9')
      .description('🧭 Typst 小节标题颜色'),
    typstStatsTextColor: Schema.string()
      .role('color')
      .default('#8788a5')
      .description('📊 Typst 统计信息文字颜色'),
  }).description('🧩 Typst 渲染配置'),

  Schema.object({
    verboseConsoleLog: Schema.boolean()
      .default(false)
      .description('🐛 启用调试日志'),
  }).description('🛠️ 调试选项'),

  createQQConfigSchema(),
])
