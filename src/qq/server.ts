import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Context } from 'koishi'
import type { Config } from '../config'

const CACHE_ROOT = 'll-serverinfo-rest-client'
const ROUTE_ROOT = '/ll-serverinfo-rest-client/render'
const registeredRoots = new WeakSet<object>()

export function applyQQImageServer(ctx: Context) {
  const root = (ctx as any).root || ctx
  if (registeredRoots.has(root)) return
  registeredRoots.add(root)

  root.inject(['server'], (serverCtx: Context) => {
    serverCtx.server.get(`${ROUTE_ROOT}/:instance/:name`, async (koaCtx) => {
      const instance = String(koaCtx.params.instance || '')
      const filename = path.basename(String(koaCtx.params.name || ''))
      if (!/^[a-z0-9-]+$/.test(instance) || !/^[a-f0-9-]+\.png$/.test(filename)) {
        koaCtx.status = 404
        return
      }

      const filePath = path.join(getCacheRoot(serverCtx.baseDir), instance, filename)
      if (!existsSync(filePath)) {
        koaCtx.status = 404
        return
      }

      koaCtx.type = 'image/png'
      koaCtx.set('Cache-Control', 'public, max-age=300')
      koaCtx.set('X-Content-Type-Options', 'nosniff')
      koaCtx.body = createReadStream(filePath)
    })
  })
}

export async function storeQQImage(ctx: Context, config: Config, image: Buffer): Promise<string> {
  if (!ctx.server) throw new Error('未启用 Koishi server 服务')
  const publicBaseUrl = String(config.publicBaseUrl || ctx.server.config?.selfUrl || '').trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(publicBaseUrl)) {
    throw new Error('publicBaseUrl 或 server.selfUrl 不是可访问的 HTTP(S) 地址')
  }

  const instance = getInstanceKey(config.commandPrefix)
  const cacheDir = path.join(getCacheRoot(ctx.baseDir), instance)
  await mkdir(cacheDir, { recursive: true })
  await cleanupCache(cacheDir, config.qqImageCacheTtlMinutes, config.qqImageCacheMaxFiles)

  const filename = `${randomUUID()}.png`
  await writeFile(path.join(cacheDir, filename), image)
  await cleanupCache(cacheDir, config.qqImageCacheTtlMinutes, config.qqImageCacheMaxFiles)
  return `${publicBaseUrl}${ROUTE_ROOT}/${instance}/${filename}`
}

function getCacheRoot(baseDir: string) {
  return path.join(baseDir, 'cache', CACHE_ROOT)
}

function getInstanceKey(commandPrefix: string) {
  const readable = String(commandPrefix || 'server')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24) || 'server'
  const digest = createHash('sha256').update(String(commandPrefix)).digest('hex').slice(0, 8)
  return `${readable}-${digest}`
}

async function cleanupCache(cacheDir: string, ttlMinutes: number, maxFiles: number) {
  const now = Date.now()
  const ttlMs = Math.max(1, Number(ttlMinutes) || 15) * 60_000
  const limit = Math.max(1, Math.floor(Number(maxFiles) || 50))
  const files = await readdir(cacheDir)
  const entries = await Promise.all(files
    .filter(file => /^[a-f0-9-]+\.png$/.test(file))
    .map(async file => {
      const filePath = path.join(cacheDir, file)
      const info = await stat(filePath)
      return { filePath, mtimeMs: info.mtimeMs }
    }))

  const retained: typeof entries = []
  for (const entry of entries) {
    if (now - entry.mtimeMs >= ttlMs) {
      await unlink(entry.filePath).catch(() => {})
    } else {
      retained.push(entry)
    }
  }

  retained.sort((left, right) => right.mtimeMs - left.mtimeMs)
  for (const entry of retained.slice(limit)) {
    await unlink(entry.filePath).catch(() => {})
  }
}
