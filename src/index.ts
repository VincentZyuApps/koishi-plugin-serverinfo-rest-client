import { Context, h } from 'koishi'
import type {} from '@koishijs/plugin-server'
import { Resvg } from '@resvg/resvg-js'
import { Config, OutputMode } from './config'
import { createApiClient } from './api/client'
import { checkAndDownloadFonts, getTypstFontPaths } from './font'
import { registerHealthCommand } from './commands/health'
import { registerStatusCommand } from './commands/status'
import { registerServerCommand } from './commands/server'
import { registerPlayersCommand } from './commands/players'
import { registerPlayersCountCommand } from './commands/players-count'
import { registerPlayersNamesCommand } from './commands/players-names'
import { registerPlayerCommand } from './commands/player'
import { registerOnlineCommand } from './commands/online'
import { registerHistoryCommand } from './commands/history'
import { registerPlayerDataCommand } from './commands/player-data'
import { registerExecuteCommand } from './commands/execute-command'
import { registerWhitelistCommands } from './commands/whitelist'
import { COMMAND_NAMES, commandUsage } from './commands/names'
import { applyTemplateConsole } from './console'
import {
  ensureTemplateAssets,
  getRuntimeTemplateDir,
  getRuntimeTemplatePath,
  getTemplateWorkspaceDir,
  type TypstTemplateName,
} from './template-assets'
import { applyQQImageServer } from './qq'
import fs from 'node:fs'

export const name = 'serverinfo-rest-client'

export const reusable = true; // 声明此插件可重用

export const inject = {
  required: [],
  optional: ['server', 'console'],
}

export { Config, createApiClient }
export type { ApiClient } from './api/client'
export const usage = `
## 🎮 Minecraft BDS 服务器信息查询插件

对接 LeviLamina serverinfo-rest 服务端，查询 Minecraft BDS 服务器信息。

### ⚠️ 前置依赖

Typst 图片由插件内置编译器和 Resvg 在本地渲染，无需额外渲染服务。

### 🎯 功能特性

- 🔍 查询服务器健康状态
- 📊 查询服务器状态和详细信息
- 👥 查询在线玩家列表
- 📝 支持 文字 / Typst 图片 两种输出模式

### 📝 指令列表

默认前缀为 \`mcinfo1\`，中文名称是主指令，英文名称是 alias。

| 中文主指令 | 英文 alias | 说明 |
| --- | --- | --- |
| \`mcinfo1.健康检查\` | \`mcinfo1.health\` | 健康检查 |
| \`mcinfo1.查在线\` | \`mcinfo1.online\` | 综合在线状态 |
| \`mcinfo1.历史记录 [页码]\` | \`mcinfo1.history [页码]\` | 历史玩家列表 |
| \`mcinfo1.查询数据 <玩家名>\` | \`mcinfo1.player-data <玩家名>\` | 历史玩家统计 |
| \`mcinfo1.绑定白名单 <玩家名>\` | \`mcinfo1.bind-whitelist <玩家名>\` | 绑定当前账号白名单 |
| \`mcinfo1.解绑\` | \`mcinfo1.unbind\` | 解除当前账号绑定 |
| \`mcinfo1.添加白名单 <玩家名>\` | \`mcinfo1.add-whitelist <玩家名>\` | 管理员添加白名单 |
| \`mcinfo1.移除白名单 <玩家名>\` | \`mcinfo1.remove-whitelist <玩家名>\` | 管理员移除白名单 |
| \`mcinfo1.执行命令 <命令>\` | \`mcinfo1.execute-command <命令>\` | 执行 BDS 管理命令 |
| \`mcinfo1.服务器状态\` | \`mcinfo1.status\` | 简要服务器状态 |
| \`mcinfo1.服务器信息\` | \`mcinfo1.server\` | 服务器详细信息 |
| \`mcinfo1.玩家列表\` | \`mcinfo1.players\` | 在线玩家详情 |
| \`mcinfo1.玩家数量\` | \`mcinfo1.players-count\` | 在线玩家数量 |
| \`mcinfo1.玩家名列表\` | \`mcinfo1.players-names\` | 在线玩家名列表 |
| \`mcinfo1.查询玩家 <玩家名>\` | \`mcinfo1.player <玩家名>\` | 查询指定在线玩家 |

### 🎛️ 通用选项

所有指令都支持 \`--mode\` 参数来指定输出模式：

- \`--mode text\` - 文字输出
- \`--mode image\` - Typst 图片输出
`

// ==================== Typst 渲染器 ====================

import type { NodeCompiler, NodeAddFontBlobs } from '@myriaddreamin/typst-ts-node-compiler'

export interface TypstTheme {
  fontFamily: string
  pageBg: string
  textColor: string
  headerFill: string
  headerStroke: string
  headerText: string
  panelFill: string
  panelStroke: string
  sectionTitle: string
  statsText: string
}

export interface TypstTemplateTheme {
  font_family: string
  page_bg: string
  text: string
  header_fill: string
  header_stroke: string
  header_text: string
  panel_fill: string
  panel_stroke: string
  section_title: string
  stats_text: string
}

function normalizeColorHex(value: string | undefined, fallback: string): string {
  const normalized = (value || '').trim()
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.toLowerCase()
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return `#${normalized.slice(1).split('').map(char => `${char}${char}`).join('')}`.toLowerCase()
  }
  const rgbMatch = normalized.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (!rgbMatch) return fallback
  const toHex = (channel: string) => Math.min(255, Number(channel)).toString(16).padStart(2, '0')
  return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`
}

function toTypstColor(value: string | undefined, fallback: string): string {
  const v = (value || '').trim()
  if (!v) return `rgb("${fallback}")`
  if (v.startsWith('#')) return `rgb("${v}")`
  const rgbMatch = v.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (rgbMatch) return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`
  return `rgb("${fallback}")`
}

export function buildTypstTheme(cfg: Config): TypstTheme {
  return {
    fontFamily: cfg.typstFontFamily || 'LXGW WenKai Mono',
    pageBg: toTypstColor(cfg.typstPageBgColor, '#f2f6f1'),
    textColor: toTypstColor(cfg.typstTextColor, '#26332b'),
    headerFill: toTypstColor(cfg.typstHeaderFillColor, '#2c5e3b'),
    headerStroke: toTypstColor(cfg.typstHeaderStrokeColor, '#7fa973'),
    headerText: toTypstColor(cfg.typstHeaderTextColor, '#ffffff'),
    panelFill: toTypstColor(cfg.typstPanelFillColor, '#ffffff'),
    panelStroke: toTypstColor(cfg.typstPanelStrokeColor, '#cbd9ce'),
    sectionTitle: toTypstColor(cfg.typstSectionTitleColor, '#2c5e3b'),
    statsText: toTypstColor(cfg.typstStatsTextColor, '#66746b'),
  }
}

export function buildTypstTemplateTheme(cfg: Config): TypstTemplateTheme {
  return {
    font_family: cfg.typstFontFamily || 'LXGW WenKai Mono',
    page_bg: normalizeColorHex(cfg.typstPageBgColor, '#f2f6f1'),
    text: normalizeColorHex(cfg.typstTextColor, '#26332b'),
    header_fill: normalizeColorHex(cfg.typstHeaderFillColor, '#2c5e3b'),
    header_stroke: normalizeColorHex(cfg.typstHeaderStrokeColor, '#7fa973'),
    header_text: normalizeColorHex(cfg.typstHeaderTextColor, '#ffffff'),
    panel_fill: normalizeColorHex(cfg.typstPanelFillColor, '#ffffff'),
    panel_stroke: normalizeColorHex(cfg.typstPanelStrokeColor, '#cbd9ce'),
    section_title: normalizeColorHex(cfg.typstSectionTitleColor, '#2c5e3b'),
    stats_text: normalizeColorHex(cfg.typstStatsTextColor, '#66746b'),
  }
}

export function escapeTypstText(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/@/g, '\\@')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
}

export class TypstRenderer {
  private typst: typeof import('@myriaddreamin/typst-ts-node-compiler') | null = null
  private compiler: NodeCompiler | null = null
  private readonly typstModuleName = '@myriaddreamin/typst-ts-node-compiler'
  private readonly workspaceDir: string
  private initPromise: Promise<void> | null = null
  private initialized = false

  constructor(
    private ctx: Context,
    private logger: any,
    private cfg: Config,
  ) {
    this.workspaceDir = getTemplateWorkspaceDir(ctx.baseDir, cfg.typstTemplateFolderRelativePath)
  }

  async init(): Promise<void> {
    if (this.initialized) return
    if (!this.initPromise) {
      this.initPromise = import(this.typstModuleName).then((typst) => {
        this.typst = typst
        this.initialized = true
        this.logger.info('Typst 模块加载成功')
      }).catch((error) => {
        this.initPromise = null
        throw error
      })
    }
    await this.initPromise
  }

  isReady(): boolean {
    return this.initialized && !!this.typst
  }

  private getCompiler(): NodeCompiler {
    if (!this.typst) {
      throw new Error('Typst 模块未初始化，请先调用 init()')
    }

    if (!this.compiler) {
      const fontArgs: NodeAddFontBlobs[] = []
      for (const fontPath of getTypstFontPaths(this.ctx, this.cfg)) {
        try {
          fontArgs.push({ fontBlobs: [fs.readFileSync(fontPath)] })
        } catch (error) {
          this.logger.warn(`加载字体失败: ${fontPath}, ${error}`)
        }
      }
      this.compiler = this.typst.NodeCompiler.create({
        fontArgs,
        workspace: this.workspaceDir,
      })
    }

    return this.compiler
  }

  private fixSvgForResvg(svg: string): string {
    let fixed = svg.replace(
      /\.outline_glyph\s+path,\s*\npath\.outline_glyph\s*{\s*\n\s*fill:\s*var\(--glyph_fill\);\s*\n\s*stroke:\s*var\(--glyph_stroke\);\s*\n}/g,
      ''
    )
    fixed = fixed.replace(/\.outline_glyph[^}]*fill:\s*var\(--glyph_fill\)[^}]*}/g, '')
    fixed = fixed.replace(/\.outline_glyph[^}]*transition[^}]*}/g, '')
    fixed = fixed.replace(/\.hover\s+\.typst-text\s*{[^}]*}/g, '')
    return fixed
  }

  private toSvg(content: string): string {
    const compiler = this.getCompiler()
    try {
      let result = compiler.svg({ mainFileContent: content })
      result = this.fixSvgForResvg(result)
      return result
    } finally {
      compiler.evictCache(10)
    }
  }

  private toTemplateSvg(template: TypstTemplateName, payload: Record<string, unknown>): string {
    const compiler = this.getCompiler()
    const mainFilePath = getRuntimeTemplatePath(
      this.ctx.baseDir,
      this.cfg.typstTemplateFolderRelativePath,
      template,
    )
    try {
      let result = compiler.svg({
        mainFilePath,
        inputs: {
          payload: JSON.stringify({
            ...payload,
            theme: buildTypstTemplateTheme(this.cfg),
          }),
        },
        resetRead: true,
      })
      result = this.fixSvgForResvg(result)
      return result
    } finally {
      compiler.evictCache(10)
    }
  }

  async toPng(content: string, scale: number = 2.33): Promise<Buffer> {
    const svg = this.toSvg(content)
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: scale },
      font: { loadSystemFonts: true },
    })
    return resvg.render().asPng()
  }

  async toTemplatePng(
    template: TypstTemplateName,
    payload: Record<string, unknown>,
    scale: number = 2.33,
  ): Promise<Buffer> {
    const svg = this.toTemplateSvg(template, payload)
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: scale },
      font: { loadSystemFonts: true },
    })
    return resvg.render().asPng()
  }

  resetTemplateCache(): void {
    this.compiler?.evictCache(0)
  }
}

const renderers = new WeakMap<Context, TypstRenderer>()
const activeRenderers = new Set<TypstRenderer>()

export async function getTypstRenderer(ctx: Context, cfg: Config, logger: any): Promise<TypstRenderer> {
  let renderer = renderers.get(ctx)
  if (!renderer) {
    renderer = new TypstRenderer(ctx, logger, cfg)
    renderers.set(ctx, renderer)
    activeRenderers.add(renderer)
    ctx.on('dispose', () => {
      renderers.delete(ctx)
      activeRenderers.delete(renderer)
    })
  }
  if (!renderer.isReady()) {
    await renderer.init()
  }
  return renderer
}

export async function renderTypstTemplate(
  ctx: Context,
  cfg: Config,
  logger: any,
  template: TypstTemplateName,
  payload: Record<string, unknown>,
): Promise<Buffer> {
  const renderer = await getTypstRenderer(ctx, cfg, logger)
  return renderer.toTemplatePng(template, payload, cfg.typstRenderScale)
}

export function resetTypstTemplateCaches(): void {
  for (const renderer of activeRenderers) renderer.resetTemplateCache()
}

// ==================== 工具函数 ====================

export function resolveOutputModes(modeArg: string | undefined, cfg: Config): OutputMode[] {
  if (modeArg) {
    if (modeArg === 'text') return ['text']
    if (modeArg === 'image') return ['typst-image']
  }
  return cfg.defaultOutputModes
}

export function createTypstFailureOutput(
  error: unknown,
  cfg: Config,
  modes: OutputMode[],
  textOutput: string,
): ReturnType<typeof h.text> | null {
  if (cfg.typstFallbackToText) {
    return modes.includes('text') ? null : h.text(textOutput)
  }
  const message = error instanceof Error ? error.message : String(error)
  return h.text(`[Typst 渲染失败: ${message}]`)
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

// ==================== 插件入口 ====================

export async function apply(ctx: Context, cfg: Config) {
  const logger = ctx.logger(name)
  await ensureTemplateAssets(ctx, cfg)
  logger.info(`Typst 运行时模板目录: ${getRuntimeTemplateDir(ctx.baseDir, cfg.typstTemplateFolderRelativePath)}`)
  applyTemplateConsole(ctx, cfg, logger, resetTypstTemplateCaches)
  await checkAndDownloadFonts(ctx, cfg).catch((error) => {
    logger.warn(`字体下载失败，Typst 图片可能无法正确渲染: ${error}`)
  })
  const apiClient = createApiClient(cfg, logger)
  applyQQImageServer(ctx)

  logger.info(`服务器地址: ${apiClient.getBaseUrl()}`)
  logger.info(`API 地址: ${apiClient.getApiBase()}`)

  const prefix = cfg.commandPrefix || 'mcinfo1'
  const label = cfg.serverLabel || '【神秘小服服】'

  // 注册主指令
  ctx.command(prefix, `${label} Minecraft BDS 服务器信息查询`)
    .action(async ({ session }) => {
      return h.text(`🎮 ${label} Minecraft BDS 服务器信息查询

使用以下子指令查询服务器信息：
• ${commandUsage(prefix, COMMAND_NAMES.health)} - 健康检查
• ${commandUsage(prefix, COMMAND_NAMES.online)} - 查询服务器在线状态
• ${commandUsage(prefix, COMMAND_NAMES.history, '[页码]')} - 查询历史玩家
• ${commandUsage(prefix, COMMAND_NAMES.playerData, '<玩家名>')} - 查询历史游玩与统计数据
• ${commandUsage(prefix, COMMAND_NAMES.bindWhitelist, '<玩家名>')} - 绑定当前账号白名单
• ${commandUsage(prefix, COMMAND_NAMES.unbindWhitelist)} - 解除当前账号普通绑定（不撤销管理员直接授权）
• ${commandUsage(prefix, COMMAND_NAMES.addWhitelist, '<玩家名>')} - 管理员直接添加白名单
• ${commandUsage(prefix, COMMAND_NAMES.removeWhitelist, '<玩家名>')} - 管理员移除白名单
• ${commandUsage(prefix, COMMAND_NAMES.executeCommand, '<命令>')} - 管理员执行 BDS 命令
• ${commandUsage(prefix, COMMAND_NAMES.status)} - 服务器状态
• ${commandUsage(prefix, COMMAND_NAMES.server)} - 服务器详细信息
• ${commandUsage(prefix, COMMAND_NAMES.players)} - 玩家列表
• ${commandUsage(prefix, COMMAND_NAMES.playersCount)} - 玩家数量
• ${commandUsage(prefix, COMMAND_NAMES.playersNames)} - 玩家名列表
• ${commandUsage(prefix, COMMAND_NAMES.player, '<玩家名>')} - 查询指定玩家

所有指令支持 --mode (text/image) 参数指定输出模式`)
    })

  // 注册子指令
  registerHealthCommand(ctx, cfg, apiClient, logger, prefix, label)
  registerOnlineCommand(ctx, cfg, apiClient, logger, prefix)
  registerHistoryCommand(ctx, cfg, apiClient, logger, prefix)
  registerPlayerDataCommand(ctx, cfg, apiClient, logger, prefix)
  registerExecuteCommand(ctx, cfg, apiClient, logger, prefix)
  registerWhitelistCommands(ctx, cfg, apiClient, logger, prefix)
  registerStatusCommand(ctx, cfg, apiClient, logger, prefix, label)
  registerServerCommand(ctx, cfg, apiClient, logger, prefix, label)
  registerPlayersCommand(ctx, cfg, apiClient, logger, prefix, label)
  registerPlayersCountCommand(ctx, cfg, apiClient, logger, prefix, label)
  registerPlayersNamesCommand(ctx, cfg, apiClient, logger, prefix, label)
  registerPlayerCommand(ctx, cfg, apiClient, logger, prefix, label)
}
