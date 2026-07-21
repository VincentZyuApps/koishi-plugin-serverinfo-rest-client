import path from 'node:path'
import type { Context } from 'koishi'
import type {} from '@koishijs/plugin-console'
import type { Config } from './config'
import {
  getTemplateAssetStatus,
  listRuntimeTemplateFiles,
  restoreOfficialTemplates,
  type TemplateAssetStatus,
  type TemplateRestoreResult,
} from './template-assets'

export interface TemplateConsoleStatus extends TemplateAssetStatus {
  files: string[]
}

declare module '@koishijs/plugin-console' {
  interface Events {
    'll-serverinfo-rest-client/templates/status'(): Promise<TemplateConsoleStatus>
    'll-serverinfo-rest-client/templates/restore'(): Promise<TemplateRestoreResult>
  }
}

const registeredRoots = new WeakSet<object>()

export function applyTemplateConsole(
  ctx: Context,
  cfg: Config,
  logger: any,
  resetTemplateCaches: () => void,
): void {
  const root = ((ctx as Context & { root?: Context }).root || ctx) as Context
  if (registeredRoots.has(root)) return
  registeredRoots.add(root)

  root.inject(['console'], (consoleCtx) => {
    consoleCtx.console.addListener('ll-serverinfo-rest-client/templates/status', async () => ({
      ...(await getTemplateAssetStatus(root.baseDir, cfg.typstTemplateFolderRelativePath)),
      files: await listRuntimeTemplateFiles(root.baseDir, cfg.typstTemplateFolderRelativePath),
    }), { authority: 1 })

    consoleCtx.console.addListener('ll-serverinfo-rest-client/templates/restore', async () => {
      const result = await restoreOfficialTemplates(root.baseDir, cfg.typstTemplateFolderRelativePath)
      resetTemplateCaches()
      logger.info(`Typst 默认模板已恢复；备份目录: ${result.backupPath || '无（原目录不存在）'}`)
      return result
    }, { authority: 4 })

    consoleCtx.console.addEntry({
      dev: path.resolve(__dirname, '../client/index.ts'),
      prod: path.resolve(__dirname, '../dist'),
    })
  })
}
