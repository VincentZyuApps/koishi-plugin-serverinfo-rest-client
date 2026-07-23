import path from 'node:path'
import { mkdtemp, readFile, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  ensureTemplateAssets,
  getRuntimeTemplateDir,
  getTemplateAssetStatus,
  restoreOfficialTemplates,
} from '../src/template'

const config = {
  typstTemplateFolderRelativePath: ['data', 'assets', 'll-serverinfo-rest-client', 'runtime', 'templates'],
} as any

async function createBaseDir(): Promise<string> {
  return mkdtemp(path.join(process.env.TEMP || process.cwd(), 'll-serverinfo-assets-test-'))
}

describe('Typst template assets', () => {
  it('only seeds missing files and keeps user edits on startup', async () => {
    const baseDir = await createBaseDir()
    const ctx = { baseDir } as any
    try {
      await ensureTemplateAssets(ctx, config)
      const runtimeDir = getRuntimeTemplateDir(baseDir, config.typstTemplateFolderRelativePath)
      const commonPath = path.join(runtimeDir, 'common.typ')
      const healthPath = path.join(runtimeDir, 'health-status.typ')
      await writeFile(commonPath, '// user customized template\n', 'utf8')
      await unlink(healthPath)

      await ensureTemplateAssets(ctx, config)

      expect(await readFile(commonPath, 'utf8')).toBe('// user customized template\n')
      expect((await readFile(healthPath, 'utf8')).length).toBeGreaterThan(100)
      const status = await getTemplateAssetStatus(baseDir, config.typstTemplateFolderRelativePath)
      expect(status.missingCount).toBe(0)
      expect(status.modifiedCount).toBe(1)
    } finally {
      await rm(baseDir, { recursive: true, force: true })
    }
  })

  it('backs up the runtime directory before restoring official templates', async () => {
    const baseDir = await createBaseDir()
    const ctx = { baseDir } as any
    try {
      await ensureTemplateAssets(ctx, config)
      const runtimeDir = getRuntimeTemplateDir(baseDir, config.typstTemplateFolderRelativePath)
      await writeFile(path.join(runtimeDir, 'common.typ'), '// customized\n', 'utf8')

      const result = await restoreOfficialTemplates(baseDir, config.typstTemplateFolderRelativePath)

      expect(result.backupPath).toMatch(/templates-backup-\d{8}-\d{6}$/)
      expect(result.modifiedCount).toBe(0)
      expect(result.missingCount).toBe(0)
      expect(await readFile(path.join(result.backupPath!, 'common.typ'), 'utf8')).toBe('// customized\n')
      expect(await readFile(path.join(runtimeDir, 'common.typ'), 'utf8')).toContain('#let payload')
    } finally {
      await rm(baseDir, { recursive: true, force: true })
    }
  })

  it('repairs the known legacy templates whose page setup was scoped incorrectly', async () => {
    const baseDir = await createBaseDir()
    const ctx = { baseDir } as any
    try {
      await ensureTemplateAssets(ctx, config)
      const runtimeDir = getRuntimeTemplateDir(baseDir, config.typstTemplateFolderRelativePath)
      await writeFile(path.join(runtimeDir, 'common.typ'), '#let setup-page(width) = { set page(width: width) }\n', 'utf8')
      const entryFiles = (await import('../src/template')).TEMPLATE_FILES.filter(file => file !== 'common.typ')
      for (const fileName of entryFiles) {
        await writeFile(path.join(runtimeDir, fileName), '#import "common.typ": *\n#setup-page(400pt)\n', 'utf8')
      }

      await ensureTemplateAssets(ctx, config)

      expect(await readFile(path.join(runtimeDir, 'common.typ'), 'utf8')).not.toContain('#let setup-page(')
      expect(await readFile(path.join(runtimeDir, 'players-count.typ'), 'utf8')).toContain('#set page(')
      expect((await getTemplateAssetStatus(baseDir, config.typstTemplateFolderRelativePath)).modifiedCount).toBe(0)
    } finally {
      await rm(baseDir, { recursive: true, force: true })
    }
  })

  it('backs up and upgrades the legacy player detail payload template only', async () => {
    const baseDir = await createBaseDir()
    const ctx = { baseDir } as any
    try {
      await ensureTemplateAssets(ctx, config)
      const runtimeDir = getRuntimeTemplateDir(baseDir, config.typstTemplateFolderRelativePath)
      const playerDetailPath = path.join(runtimeDir, 'player-detail.typ')
      const commonPath = path.join(runtimeDir, 'common.typ')
      const legacy = '#let position-row = if payload.position == none { () }\n#payload.xuid\n'
      await writeFile(playerDetailPath, legacy, 'utf8')
      await writeFile(commonPath, '// custom common template\n', 'utf8')

      await ensureTemplateAssets(ctx, config)

      expect(await readFile(playerDetailPath, 'utf8')).toContain('payload.sections')
      expect(await readFile(commonPath, 'utf8')).toBe('// custom common template\n')
      const backups = (await readdir(runtimeDir)).filter(file => file.startsWith('player-detail.typ.backup-'))
      expect(backups).toHaveLength(1)
      expect(await readFile(path.join(runtimeDir, backups[0]), 'utf8')).toBe(legacy)
    } finally {
      await rm(baseDir, { recursive: true, force: true })
    }
  })

  it('rejects paths that escape the Koishi base directory', () => {
    const baseDir = path.resolve('koishi-test')
    for (const unsafePart of ['..', '/outside', 'C:\\outside', 'nested/path', 'nested\\path']) {
      expect(() => getRuntimeTemplateDir(baseDir, [unsafePart])).toThrow('非法的 Typst 模板路径片段')
    }
  })
})
