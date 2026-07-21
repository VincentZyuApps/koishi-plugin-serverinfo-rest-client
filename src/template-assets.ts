import path from 'node:path'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rename, rm } from 'node:fs/promises'
import type { Context } from 'koishi'
import type { Config } from './config'

export const TEMPLATE_ASSET_PARTS = [
  'data',
  'assets',
  'll-serverinfo-rest-client',
  'runtime',
  'templates',
] as const

export const TEMPLATE_ENTRIES = {
  healthStatus: 'health-status.typ',
  onlineStatus: 'online-status.typ',
  playerHistory: 'player-history.typ',
  playerStats: 'player-stats.typ',
  playerDetail: 'player-detail.typ',
  playersList: 'players-list.typ',
  playersCount: 'players-count.typ',
  playerNames: 'player-names.typ',
  serverInfo: 'server-info.typ',
  serverStatus: 'server-status.typ',
} as const

export type TypstTemplateName = keyof typeof TEMPLATE_ENTRIES

export const TEMPLATE_FILES = [
  'common.typ',
  ...Object.values(TEMPLATE_ENTRIES),
] as const

export interface TemplateAssetStatus {
  runtimePath: string
  officialCount: number
  readyCount: number
  modifiedCount: number
  missingCount: number
}

export interface TemplateRestoreResult extends TemplateAssetStatus {
  backupPath: string | null
}

const seedTasks = new Map<string, Promise<void>>()
const restoreTasks = new Map<string, Promise<TemplateRestoreResult>>()
const operationTasks = new Map<string, Promise<unknown>>()

async function runExclusive<T>(runtimeDir: string, operation: () => Promise<T>): Promise<T> {
  const previous = operationTasks.get(runtimeDir) || Promise.resolve()
  const task = previous.catch(() => undefined).then(operation)
  operationTasks.set(runtimeDir, task)
  try {
    return await task
  } finally {
    if (operationTasks.get(runtimeDir) === task) operationTasks.delete(runtimeDir)
  }
}

function normalizeAssetParts(parts: readonly string[] | undefined): string[] {
  const values = (parts || TEMPLATE_ASSET_PARTS).map(part => String(part).trim()).filter(Boolean)
  const normalized = values.length ? values : [...TEMPLATE_ASSET_PARTS]
  for (const part of normalized) {
    if (part === '.' || part === '..' || path.isAbsolute(part) || path.basename(part) !== part) {
      throw new Error(`非法的 Typst 模板路径片段: ${part}`)
    }
  }
  return normalized
}

function resolveInsideBaseDir(baseDir: string, parts: readonly string[]): string {
  const root = path.resolve(baseDir)
  const target = path.resolve(root, ...parts)
  const relative = path.relative(root, target)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Typst 模板路径必须位于 Koishi 根目录内: ${target}`)
  }
  return target
}

function getBundledTemplateDir(): string {
  return path.resolve(__dirname, '../templates')
}

export function getRuntimeTemplateDir(baseDir: string, parts?: readonly string[]): string {
  return resolveInsideBaseDir(baseDir, normalizeAssetParts(parts))
}

export function getTemplateWorkspaceDir(baseDir: string, parts?: readonly string[]): string {
  return path.dirname(getRuntimeTemplateDir(baseDir, parts))
}

export function getRuntimeTemplatePath(
  baseDir: string,
  parts: readonly string[] | undefined,
  template: TypstTemplateName,
): string {
  return path.join(getRuntimeTemplateDir(baseDir, parts), TEMPLATE_ENTRIES[template])
}

async function copyFileAtomic(sourcePath: string, targetPath: string): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true })
  const temporaryPath = `${targetPath}.tmp-${process.pid}-${Math.random().toString(16).slice(2)}`
  try {
    await copyFile(sourcePath, temporaryPath)
    await rename(temporaryPath, targetPath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function seedMissingTemplates(baseDir: string, parts?: readonly string[]): Promise<void> {
  const bundledDir = getBundledTemplateDir()
  const runtimeDir = getRuntimeTemplateDir(baseDir, parts)
  await mkdir(runtimeDir, { recursive: true })

  const hasLegacyCommon = existsSync(path.join(runtimeDir, 'common.typ'))
    && (await readFile(path.join(runtimeDir, 'common.typ'), 'utf8')).includes('#let setup-page(')
  const hasLegacyEntries = hasLegacyCommon && await Promise.all(
    Object.values(TEMPLATE_ENTRIES).map(async (fileName) => {
      const filePath = path.join(runtimeDir, fileName)
      return existsSync(filePath) && (await readFile(filePath, 'utf8')).includes('#setup-page(')
    }),
  ).then(results => results.every(Boolean))

  if (hasLegacyEntries) {
    const backupPath = await getUniqueBackupPath(runtimeDir)
    await rename(runtimeDir, backupPath)
    try {
      await mkdir(runtimeDir, { recursive: true })
      for (const fileName of TEMPLATE_FILES) {
        await copyFileAtomic(path.join(bundledDir, fileName), path.join(runtimeDir, fileName))
      }
    } catch (error) {
      await rm(runtimeDir, { recursive: true, force: true })
      await rename(backupPath, runtimeDir)
      throw error
    }
    return
  }

  for (const fileName of TEMPLATE_FILES) {
    const sourcePath = path.join(bundledDir, fileName)
    const targetPath = path.join(runtimeDir, fileName)
    if (!existsSync(targetPath)) await copyFileAtomic(sourcePath, targetPath)
  }
}

export async function ensureTemplateAssets(ctx: Context, cfg: Config): Promise<void> {
  const runtimeDir = getRuntimeTemplateDir(ctx.baseDir, cfg.typstTemplateFolderRelativePath)
  let task = seedTasks.get(runtimeDir)
  if (!task) {
    task = runExclusive(runtimeDir, () => seedMissingTemplates(ctx.baseDir, cfg.typstTemplateFolderRelativePath))
      .finally(() => seedTasks.delete(runtimeDir))
    seedTasks.set(runtimeDir, task)
  }
  await task
}

export async function getTemplateAssetStatus(
  baseDir: string,
  parts?: readonly string[],
): Promise<TemplateAssetStatus> {
  const bundledDir = getBundledTemplateDir()
  const runtimeDir = getRuntimeTemplateDir(baseDir, parts)
  let readyCount = 0
  let modifiedCount = 0
  let missingCount = 0

  for (const fileName of TEMPLATE_FILES) {
    const targetPath = path.join(runtimeDir, fileName)
    if (!existsSync(targetPath)) {
      missingCount += 1
      continue
    }
    readyCount += 1
    const [officialData, runtimeData] = await Promise.all([
      readFile(path.join(bundledDir, fileName)),
      readFile(targetPath),
    ])
    if (!officialData.equals(runtimeData)) modifiedCount += 1
  }

  return {
    runtimePath: runtimeDir,
    officialCount: TEMPLATE_FILES.length,
    readyCount,
    modifiedCount,
    missingCount,
  }
}

function formatSecondTimestamp(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

async function getUniqueBackupPath(runtimeDir: string): Promise<string> {
  const parentDir = path.dirname(runtimeDir)
  const baseName = `templates-backup-${formatSecondTimestamp()}`
  let candidate = path.join(parentDir, baseName)
  let suffix = 2
  while (existsSync(candidate)) {
    candidate = path.join(parentDir, `${baseName}-${suffix}`)
    suffix += 1
  }
  return candidate
}

async function restoreTemplates(baseDir: string, parts?: readonly string[]): Promise<TemplateRestoreResult> {
  const bundledDir = getBundledTemplateDir()
  const runtimeDir = getRuntimeTemplateDir(baseDir, parts)
  const parentDir = path.dirname(runtimeDir)
  const backupPath = existsSync(runtimeDir) ? await getUniqueBackupPath(runtimeDir) : null
  const stagingDir = path.join(
    parentDir,
    `.templates-restore-${formatSecondTimestamp()}-${process.pid}-${Math.random().toString(16).slice(2)}`,
  )
  let movedToBackup = false

  await mkdir(stagingDir, { recursive: true })
  try {
    for (const fileName of TEMPLATE_FILES) {
      await copyFile(path.join(bundledDir, fileName), path.join(stagingDir, fileName))
    }
    if (backupPath) {
      await rename(runtimeDir, backupPath)
      movedToBackup = true
    }
    await rename(stagingDir, runtimeDir)
  } catch (error) {
    if (movedToBackup && backupPath && !existsSync(runtimeDir) && existsSync(backupPath)) {
      await rename(backupPath, runtimeDir)
    }
    throw error
  } finally {
    await rm(stagingDir, { recursive: true, force: true })
  }

  return {
    ...(await getTemplateAssetStatus(baseDir, parts)),
    backupPath,
  }
}

export async function restoreOfficialTemplates(
  baseDir: string,
  parts?: readonly string[],
): Promise<TemplateRestoreResult> {
  const runtimeDir = getRuntimeTemplateDir(baseDir, parts)
  let task = restoreTasks.get(runtimeDir)
  if (!task) {
    task = runExclusive(runtimeDir, () => restoreTemplates(baseDir, parts))
      .finally(() => restoreTasks.delete(runtimeDir))
    restoreTasks.set(runtimeDir, task)
  }
  return task
}

export async function listRuntimeTemplateFiles(baseDir: string, parts?: readonly string[]): Promise<string[]> {
  const runtimeDir = getRuntimeTemplateDir(baseDir, parts)
  if (!existsSync(runtimeDir)) return []
  return (await readdir(runtimeDir)).filter(fileName => fileName.endsWith('.typ')).sort()
}
