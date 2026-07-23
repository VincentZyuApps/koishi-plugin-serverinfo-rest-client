import { Schema } from 'koishi'
import { DEFAULT_QQ_KEYBOARD, stringifyKeyboard } from './keyboard'

export interface QQConfig {
  qqMarkdownEnabled: boolean
  publicBaseUrl: string
  qqImageCacheTtlMinutes: number
  qqImageCacheMaxFiles: number
  qqMarkdownMaxPlayers: number
  qqMarkdownKeyboardEnabled: boolean
  qqMarkdownKeyboardJson: string
}

export function createQQConfigSchema(): Schema<QQConfig> {
  return Schema.object({
    qqMarkdownEnabled: Schema.boolean()
      .default(true)
      .description('🤖 QQ 平台使用原生 Markdown，并通过 server 服务提供状态图片'),
    publicBaseUrl: Schema.string()
      .default('')
      .role('textarea', { rows: [2, 4] })
      .description('🌐 QQ Markdown 图片公网根地址；留空时回退 Koishi server.selfUrl'),
    qqImageCacheTtlMinutes: Schema.number()
      .min(1)
      .step(1)
      .default(15)
      .description('🧹 QQ Markdown 临时图片保留分钟数'),
    qqImageCacheMaxFiles: Schema.number()
      .min(1)
      .step(1)
      .default(50)
      .description('🗃️ 每个 reusable 实例最多保留的 QQ Markdown 图片数量'),
    qqMarkdownMaxPlayers: Schema.number()
      .min(1)
      .step(1)
      .default(50)
      .description('👥 QQ Markdown 在线玩家名单最大展示数量'),
    qqMarkdownKeyboardEnabled: Schema.boolean()
      .default(true)
      .description('⌨️ QQ Markdown 附带刷新和帮助按钮'),
    qqMarkdownKeyboardJson: Schema.string()
      .role('textarea', { rows: [8, 16] })
      .default(stringifyKeyboard(DEFAULT_QQ_KEYBOARD))
      .description('⌨️ QQ Keyboard JSON，支持 ${commandPrefix} 和 ${serverLabel} 变量；关闭功能指令前缀时，${commandPrefix}.功能指令会同步移除前缀，单独的 ${commandPrefix} 仍指向主指令'),
  }).description('🤖 QQ Markdown 适配')
}
