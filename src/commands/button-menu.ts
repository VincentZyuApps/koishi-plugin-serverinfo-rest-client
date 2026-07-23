import { COMMAND_NAMES, aliasCommand, commandDescription, primaryCommand } from './command-names'
import type { CommandRegistrationContext } from './types'
import { buildQQButtonMenu, BUTTON_MENU_PAGE_COUNT, sendQQMarkdown } from '../qq'

export function registerButtonMenuCommand({
  ctx,
  config,
  logger,
  prefix,
}: CommandRegistrationContext) {
  const buttonMenuCommand = primaryCommand(prefix, COMMAND_NAMES.buttonMenu)
  ctx.command(
    `${buttonMenuCommand} [page:number]`,
    commandDescription(COMMAND_NAMES.buttonMenu, '打开 QQ 平台按钮菜单'),
  )
    .alias(aliasCommand(prefix, COMMAND_NAMES.buttonMenu))
    .action(async ({ session }, requestedPage) => {
      if (session.platform !== 'qq') return '❌ 按钮菜单仅支持 QQ 平台'
      if (!config.qqMarkdownEnabled) return '❌ QQ Markdown 已关闭，无法发送按钮菜单'
      if (!config.qqMarkdownKeyboardEnabled) return '❌ QQ Markdown 按钮已关闭，无法发送按钮菜单'

      const page = requestedPage === undefined ? 1 : Number(requestedPage)
      if (!Number.isInteger(page)) return `❌ 页码只能是 1 或 ${BUTTON_MENU_PAGE_COUNT}`
      if (page < 1) return '❌ 已经是第一页了'
      if (page > BUTTON_MENU_PAGE_COUNT) return '❌ 已经是最后一页了'

      const menu = buildQQButtonMenu(config, page as 1 | 2)
      if (!menu.keyboard) return '❌ QQ Markdown 按钮已关闭，无法发送按钮菜单'
      try {
        await sendQQMarkdown(
          session,
          menu.markdown,
          menu.fallbackContent,
          menu.keyboard,
        )
        return ''
      } catch (error) {
        logger.error(`发送 QQ 按钮菜单失败: ${error}`)
        return `❌ 发送按钮菜单失败：${error instanceof Error ? error.message : String(error)}`
      }
    })
}
