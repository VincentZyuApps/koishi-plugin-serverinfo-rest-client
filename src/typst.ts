import { Context, h } from 'koishi'
import { Resvg } from '@resvg/resvg-js'
import type { NodeAddFontBlobs, NodeCompiler } from '@myriaddreamin/typst-ts-node-compiler'
import fs from 'node:fs'
import path from 'node:path'
import type { Config, OutputMode } from './config'
import { getTypstFontPaths } from './font'
import {
  getRuntimeTemplatePath,
  getTemplateWorkspaceDir,
  type TypstTemplateName,
} from './template'
import { formatErrorForLog, logInfo } from './logger'

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
        logInfo(this.ctx, this.cfg, 'Typst 模块加载成功')
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
    if (!this.typst) throw new Error('Typst 模块未初始化，请先调用 init()')
    if (!this.compiler) {
      const fontArgs: NodeAddFontBlobs[] = []
      for (const fontPath of getTypstFontPaths(this.ctx, this.cfg)) {
        try {
          fontArgs.push({ fontBlobs: [fs.readFileSync(fontPath)] })
        } catch (error) {
          logInfo(
            this.ctx,
            this.cfg,
            `[WARN] Typst 字体加载失败: ${path.basename(fontPath)}`,
            `路径: ${fontPath}\n${formatErrorForLog(error)}`,
          )
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
      '',
    )
    fixed = fixed.replace(/\.outline_glyph[^}]*fill:\s*var\(--glyph_fill\)[^}]*}/g, '')
    fixed = fixed.replace(/\.outline_glyph[^}]*transition[^}]*}/g, '')
    fixed = fixed.replace(/\.hover\s+\.typst-text\s*{[^}]*}/g, '')
    return fixed
  }

  private toSvg(content: string): string {
    const compiler = this.getCompiler()
    try {
      return this.fixSvgForResvg(compiler.svg({ mainFileContent: content }))
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
      return this.fixSvgForResvg(compiler.svg({
        mainFilePath,
        inputs: {
          payload: JSON.stringify({
            ...payload,
            theme: buildTypstTemplateTheme(this.cfg),
          }),
        },
        resetRead: true,
      }))
    } finally {
      compiler.evictCache(10)
    }
  }

  async toPng(content: string, scale: number = 2.33): Promise<Buffer> {
    const resvg = new Resvg(this.toSvg(content), {
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
    const resvg = new Resvg(this.toTemplateSvg(template, payload), {
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

export async function getTypstRenderer(ctx: Context, cfg: Config): Promise<TypstRenderer> {
  let renderer = renderers.get(ctx)
  if (!renderer) {
    renderer = new TypstRenderer(ctx, cfg)
    renderers.set(ctx, renderer)
    activeRenderers.add(renderer)
    ctx.on('dispose', () => {
      renderers.delete(ctx)
      activeRenderers.delete(renderer)
    })
  }
  if (!renderer.isReady()) await renderer.init()
  return renderer
}

export async function renderTypstTemplate(
  ctx: Context,
  cfg: Config,
  template: TypstTemplateName,
  payload: Record<string, unknown>,
): Promise<Buffer> {
  const renderer = await getTypstRenderer(ctx, cfg)
  return renderer.toTemplatePng(template, payload, cfg.typstRenderScale)
}

export function resetTypstTemplateCaches(): void {
  for (const renderer of activeRenderers) renderer.resetTemplateCache()
}

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
  if (cfg.typstFallbackToText) return modes.includes('text') ? null : h.text(textOutput)
  const message = error instanceof Error ? error.message : String(error)
  return h.text(`[Typst 渲染失败: ${message}]`)
}
