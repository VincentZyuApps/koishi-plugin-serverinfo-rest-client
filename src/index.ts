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
import { formatErrorForLog, logInfo } from './logger'

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
  await ensureTemplateAssets(ctx, cfg)
  applyTemplateConsole(ctx, cfg, resetTypstTemplateCaches)
  await checkAndDownloadFonts(ctx, cfg).catch((error) => {
    logInfo(
      ctx,
      cfg,
      '[WARN] 字体下载失败，Typst 图片可能无法正确渲染',
      formatErrorForLog(error),
    )
  })

  const apiClient = createApiClient(ctx, cfg)
  applyQQImageServer(ctx, cfg)
  logInfo(ctx, cfg, 'serverinfo-rest-client 已启动', [
    `Typst 运行时模板目录: ${getRuntimeTemplateDir(ctx.baseDir, cfg.typstTemplateFolderRelativePath)}`,
    `服务器地址: ${apiClient.getBaseUrl()}`,
    `API 地址: ${apiClient.getApiBase()}`,
  ].join('\n'))

  const { rootCommand, featurePrefix: prefix } = resolveCommandScope(cfg.commandPrefix, cfg.useCommandPrefix)
  const label = cfg.serverLabel || '【神秘小服服】'
  if (!prefix) {
    logInfo(ctx, cfg, `[WARN] 功能指令前缀已关闭，将保留 ${rootCommand} 主指令并注册顶级功能指令；请留意与其他插件的同名指令冲突`)
  }

  registerCommands({
    ctx,
    config: cfg,
    apiClient,
    rootCommand,
    prefix,
    label,
  })
}
