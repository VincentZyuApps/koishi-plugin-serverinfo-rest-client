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
import { applyQQImageServer } from './qq'
import fs from 'node:fs'

export const name = 'serverinfo-rest-client'

export const reusable = true; // 声明此插件可重用

export const inject = {
  required: [],
  optional: ['server'],
}

export { Config, createApiClient }
export type { ApiClient } from './api/client'
export { generateOnlineStatusTypst } from './commands/online'

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

| 指令 | 说明 |
| --- | --- |
| \`mcinfo.health\` | 健康检查 |
| \`mcinfo.status\` | 服务器状态 |
| \`mcinfo.server\` | 服务器详细信息 |
| \`mcinfo.players\` | 玩家列表 |
| \`mcinfo.players-count\` | 玩家数量 |
| \`mcinfo.players-names\` | 玩家名列表 |
| \`mcinfo.player <name>\` | 查询指定玩家 |

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
    pageBg: toTypstColor(cfg.typstPageBgColor, '#f9efe2'),
    textColor: toTypstColor(cfg.typstTextColor, '#2f2f35'),
    headerFill: toTypstColor(cfg.typstHeaderFillColor, '#5dade2'),
    headerStroke: toTypstColor(cfg.typstHeaderStrokeColor, '#3498db'),
    headerText: toTypstColor(cfg.typstHeaderTextColor, '#ffffff'),
    panelFill: toTypstColor(cfg.typstPanelFillColor, '#fffbf8'),
    panelStroke: toTypstColor(cfg.typstPanelStrokeColor, '#f3efe5'),
    sectionTitle: toTypstColor(cfg.typstSectionTitleColor, '#2980b9'),
    statsText: toTypstColor(cfg.typstStatsTextColor, '#8788a5'),
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
    this.workspaceDir = ctx.baseDir
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

  async toPng(content: string, scale: number = 2.33): Promise<Buffer> {
    const svg = this.toSvg(content)
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'zoom', value: scale },
      font: { loadSystemFonts: true },
    })
    return resvg.render().asPng()
  }
}

const renderers = new WeakMap<Context, TypstRenderer>()

export async function getTypstRenderer(ctx: Context, cfg: Config, logger: any): Promise<TypstRenderer> {
  let renderer = renderers.get(ctx)
  if (!renderer) {
    renderer = new TypstRenderer(ctx, logger, cfg)
    renderers.set(ctx, renderer)
    ctx.on('dispose', () => {
      renderers.delete(ctx)
    })
  }
  if (!renderer.isReady()) {
    await renderer.init()
  }
  return renderer
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
• ${prefix}.health - 健康检查
• ${prefix}.查在线 - 查询服务器在线状态
• ${prefix}.历史记录 [页码] - 查询历史玩家
• ${prefix}.查询数据「玩家名」- 查询历史游玩与统计数据
• ${prefix}.绑定白名单「玩家名」- 绑定当前账号白名单
• ${prefix}.解绑 - 解除当前账号普通绑定（不撤销管理员直接授权）
• ${prefix}.添加白名单「玩家名」- 管理员直接添加白名单
• ${prefix}.移除白名单「玩家名」- 管理员移除白名单
• ${prefix}.执行命令「命令」- 管理员执行 BDS 命令
• ${prefix}.status - 服务器状态
• ${prefix}.server - 服务器详细信息
• ${prefix}.players - 玩家列表
• ${prefix}.players-count - 玩家数量
• ${prefix}.players-names - 玩家名列表
• ${prefix}.player「玩家名」- 查询指定玩家

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
