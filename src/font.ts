import path from 'node:path'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import type { Context } from 'koishi'
import type { Config } from './config'

export const FONT_FILES = {
  LXGW: 'LXGWWenKaiMono-Medium.ttf',
  NOTO_EMOJI: 'NotoColorEmoji.ttf',
  NOTO_LICENSE: 'LICENSE',
} as const

export type ManagedFontKey = keyof typeof FONT_FILES

type DownloadConfigKey = 'lxgwFontReleaseUrl' | 'notoEmojiFontReleaseUrl'

interface ManagedFontMeta {
  key: ManagedFontKey
  size: number
  sha256: string
  configUrlKey?: DownloadConfigKey
  urls: string[]
}

const GITEE_RELEASE_BASE = 'https://gitee.com/vincent-zyu/koishi-plugin-quote-debug-msg-json-image/releases/download/fonts'
const GITHUB_RELEASE_BASE = 'https://github.com/VincentZyuApps/koishi-plugin-quote-debug-msg-json-image/releases/download/fonts'

export const DEFAULT_FONT_RELEASE_URLS = {
  LXGW: `${GITEE_RELEASE_BASE}/${FONT_FILES.LXGW}`,
  NOTO_EMOJI: `${GITEE_RELEASE_BASE}/${FONT_FILES.NOTO_EMOJI}`,
} as const

const FONT_META: Record<ManagedFontKey, ManagedFontMeta> = {
  LXGW: {
    key: 'LXGW',
    size: 24292472,
    sha256: 'BA4C68AD8420EBDDCDCB3328AAC6585681BEB0D5E14BC51EAF2F84D461719EB4',
    configUrlKey: 'lxgwFontReleaseUrl',
    urls: [
      `${GITEE_RELEASE_BASE}/${FONT_FILES.LXGW}`,
      `${GITHUB_RELEASE_BASE}/${FONT_FILES.LXGW}`,
    ],
  },
  NOTO_EMOJI: {
    key: 'NOTO_EMOJI',
    size: 10673480,
    sha256: '72A635CB3D2F3524C51620CDDE406B217204E8A6A06C6A096FF8ED4B5FD6E27B',
    configUrlKey: 'notoEmojiFontReleaseUrl',
    urls: [
      `${GITEE_RELEASE_BASE}/${FONT_FILES.NOTO_EMOJI}`,
      `${GITHUB_RELEASE_BASE}/${FONT_FILES.NOTO_EMOJI}`,
    ],
  },
  NOTO_LICENSE: {
    key: 'NOTO_LICENSE',
    size: 4393,
    sha256: '88F117575237307BDD86A17EF15E21790FC9A662FE4DFB103CA1CA077F0D9982',
    urls: [
      `${GITEE_RELEASE_BASE}/LICENSE`,
      `${GITHUB_RELEASE_BASE}/LICENSE`,
    ],
  },
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function normalizePath(value: string): string {
  return path.normalize(value).toLowerCase()
}

function getFontsDir(baseDir: string): string {
  return path.join(baseDir, 'data', 'fonts')
}

function getManagedFontPath(baseDir: string, key: ManagedFontKey): string {
  return path.join(getFontsDir(baseDir), FONT_FILES[key])
}

export function getSchemaFontPath(key: ManagedFontKey): string {
  return getManagedFontPath(process.cwd(), key)
}

function resolveConfiguredPath(ctx: Context, configuredPath: string, key: ManagedFontKey): string {
  const value = (configuredPath || '').trim()
  const schemaDefault = getSchemaFontPath(key)
  const legacyDefault = '/home/bawuyinguo/Fonts/LXGWWenKai/LXGWWenKaiMono-Medium.ttf'

  if (!value || normalizePath(value) === normalizePath(schemaDefault) || value === legacyDefault) {
    return getManagedFontPath(ctx.baseDir, key)
  }
  return path.isAbsolute(value) ? value : path.join(ctx.baseDir, value)
}

function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex').toUpperCase()
}

async function validateFile(filePath: string, meta: ManagedFontMeta): Promise<boolean> {
  if (!existsSync(filePath)) return false
  try {
    const data = await readFile(filePath)
    return data.length === meta.size && sha256(data) === meta.sha256
  } catch {
    return false
  }
}

function validateBuffer(data: Buffer, meta: ManagedFontMeta): string | null {
  if (data.length !== meta.size) {
    return `大小不匹配，期望 ${meta.size} bytes，实际 ${data.length} bytes`
  }
  const hash = sha256(data)
  return hash === meta.sha256 ? null : `SHA256 不匹配，期望 ${meta.sha256}，实际 ${hash}`
}

function getDownloadUrls(meta: ManagedFontMeta, cfg: Config): string[] {
  const configured = meta.configUrlKey ? String(cfg[meta.configUrlKey] || '').trim() : ''
  return unique([configured, ...meta.urls])
}

async function downloadFont(
  ctx: Context,
  cfg: Config,
  meta: ManagedFontMeta,
  filePath: string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })

  for (const url of getDownloadUrls(meta, cfg)) {
    ctx.logger.info(`下载字体资源: ${FONT_FILES[meta.key]} <- ${url}`)
    try {
      const response = await ctx.http.get(url, { responseType: 'arraybuffer', timeout: 120000 })
      const data = Buffer.from(response as ArrayBuffer)
      const invalidReason = validateBuffer(data, meta)
      if (invalidReason) {
        ctx.logger.warn(`字体资源校验失败: ${FONT_FILES[meta.key]}, ${invalidReason}`)
        continue
      }

      const tempPath = `${filePath}.tmp`
      await writeFile(tempPath, data)
      await rm(filePath, { force: true })
      await rename(tempPath, filePath)
      ctx.logger.info(`字体资源已就绪: ${FONT_FILES[meta.key]}`)
      return
    } catch (error) {
      ctx.logger.warn(`字体资源下载失败: ${FONT_FILES[meta.key]}, ${error}`)
    }
  }
  throw new Error(`无法下载并校验字体资源: ${FONT_FILES[meta.key]}`)
}

function getDownloadTargets(ctx: Context, cfg: Config): Array<{ meta: ManagedFontMeta; path: string }> {
  return [
    { meta: FONT_META.LXGW, path: resolveConfiguredPath(ctx, cfg.typstFontPath, 'LXGW') },
    { meta: FONT_META.NOTO_EMOJI, path: resolveConfiguredPath(ctx, cfg.typstEmojiFontPath, 'NOTO_EMOJI') },
    { meta: FONT_META.NOTO_LICENSE, path: getManagedFontPath(ctx.baseDir, 'NOTO_LICENSE') },
  ]
}

export async function checkAndDownloadFonts(ctx: Context, cfg: Config): Promise<void> {
  if (!cfg.downloadFontsFromRelease) return

  for (const target of getDownloadTargets(ctx, cfg)) {
    if (await validateFile(target.path, target.meta)) continue
    await downloadFont(ctx, cfg, target.meta, target.path)
  }
}

export function getTypstFontPaths(ctx: Context, cfg: Config): string[] {
  return unique([
    resolveConfiguredPath(ctx, cfg.typstFontPath, 'LXGW'),
    resolveConfiguredPath(ctx, cfg.typstEmojiFontPath, 'NOTO_EMOJI'),
  ]).filter(existsSync)
}
