import { Context, h } from 'koishi'
import type {} from '@koishijs/plugin-server'
import { Resvg } from '@resvg/resvg-js'
import { Config, OutputMode } from './config'
import { createApiClient } from './api/client'
import { checkAndDownloadFonts, getTypstFontPaths } from './font'
import { registerExecuteCommand } from './commands/command-execution'
import { COMMAND_NAMES, commandUsage } from './commands/command-names'
import { registerHealthCommand } from './commands/health-check'
import { registerPlayersCountCommand } from './commands/player-count'
import { registerPlayerCommand } from './commands/player-details'
import { registerHistoryCommand } from './commands/player-history'
import { registerPlayersCommand } from './commands/player-list'
import { registerPlayersNamesCommand } from './commands/player-names'
import { registerPlayerDataCommand } from './commands/player-statistics'
import { registerServerCommand } from './commands/server-details'
import { registerOnlineCommand } from './commands/server-overview'
import { registerStatusCommand } from './commands/server-status'
import { registerWhitelistCommands } from './commands/whitelist-commands'
import { applyTemplateConsole } from './console'
import {
  ensureTemplateAssets,
  getRuntimeTemplateDir,
  getRuntimeTemplatePath,
  getTemplateWorkspaceDir,
  type TypstTemplateName,
} from './template'
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
export { usage } from './usage'

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
  transparent_background: boolean
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
    pageBg: cfg.typstTransparentBackground ? 'none' : toTypstColor(cfg.typstPageBgColor, '#f2f6f1'),
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
    transparent_background: !!cfg.typstTransparentBackground,
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
      ...(!this.cfg.typstTransparentBackground && {
        background: normalizeColorHex(this.cfg.typstPageBgColor, '#f2f6f1'),
      }),
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
      ...(!this.cfg.typstTransparentBackground && {
        background: normalizeColorHex(this.cfg.typstPageBgColor, '#f2f6f1'),
      }),
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
  ctx.command(prefix, `🎮 ${label} Minecraft BDS 服务器信息查询`)
    .action(async ({ session }) => {
      return h.text(`🎮 ${label} Minecraft BDS 服务器信息查询

使用以下子指令查询服务器信息：
• ${commandUsage(prefix, COMMAND_NAMES.health)} - 健康检查
• ${commandUsage(prefix, COMMAND_NAMES.online)} - 查询服务器在线状态
• ${commandUsage(prefix, COMMAND_NAMES.history, '[页码]')} - 查询历史玩家
• ${commandUsage(prefix, COMMAND_NAMES.playerData, '[玩家名]')} - 查询自己或指定玩家的历史游玩与统计数据
• ${commandUsage(prefix, COMMAND_NAMES.bindWhitelist, '<玩家名>')} - 绑定聊天账号与 Xbox 玩家；LeviLamina 服务端启用白名单进服校验时同时授权进服
• ${commandUsage(prefix, COMMAND_NAMES.unbindWhitelist)} - 解除当前账号的玩家绑定；启用校验时同步处理普通绑定权限
• ${commandUsage(prefix, COMMAND_NAMES.addWhitelist, '<玩家名>')} - 管理员直接添加白名单
• ${commandUsage(prefix, COMMAND_NAMES.removeWhitelist, '<玩家名>')} - 管理员移除白名单
• ${commandUsage(prefix, COMMAND_NAMES.executeCommand, '<命令>')} - 管理员执行 BDS 命令
• ${commandUsage(prefix, COMMAND_NAMES.status)} - 服务器状态
• ${commandUsage(prefix, COMMAND_NAMES.server)} - 服务器详细信息
• ${commandUsage(prefix, COMMAND_NAMES.players)} - 玩家列表
• ${commandUsage(prefix, COMMAND_NAMES.playersCount)} - 玩家数量
• ${commandUsage(prefix, COMMAND_NAMES.playersNames)} - 玩家名列表
• ${commandUsage(prefix, COMMAND_NAMES.player, '<玩家名>')} - 查询指定在线玩家的实时详情

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
