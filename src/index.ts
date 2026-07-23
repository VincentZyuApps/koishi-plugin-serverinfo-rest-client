import { Context } from 'koishi'
import type {} from '@koishijs/plugin-server'
import { Config } from './config'
import { createApiClient } from './api/client'
import { registerCommands, resolveCommandScope } from './commands'
import { applyTemplateConsole } from './console'
import { checkAndDownloadFonts } from './font'
import { applyQQImageServer } from './qq'
import { ensureTemplateAssets, getRuntimeTemplateDir } from './template'
import { resetTypstTemplateCaches } from './typst'

export const name = 'serverinfo-rest-client'

export const reusable = true

export const inject = {
  required: [],
  optional: ['server', 'console'],
}

export { Config, createApiClient }
export type { ApiClient } from './api/client'
export * from './typst'
export { usage } from './usage'

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

  const { rootCommand, featurePrefix: prefix } = resolveCommandScope(cfg.commandPrefix, cfg.useCommandPrefix)
  const label = cfg.serverLabel || '【神秘小服服】'
  if (!prefix) {
    logger.warn(`功能指令前缀已关闭，将保留 ${rootCommand} 主指令并注册顶级功能指令；请留意与其他插件的同名指令冲突`)
  }

  registerCommands({
    ctx,
    config: cfg,
    apiClient,
    logger,
    rootCommand,
    prefix,
    label,
  })
}
