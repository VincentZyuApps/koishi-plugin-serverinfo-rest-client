import type { Config } from '../config'
import {
  COMMAND_NAMES,
  primaryCommand,
  resolveCommandScope,
  type CommandName,
} from '../commands/command-names'
import { CLIENT_VERSION } from '../version'
import { buildCommandKeyboard, type CommandKeyboardButton } from './keyboard'
import { escapeMarkdown } from './template'
import type { QQKeyboard } from './types'

export const BUTTON_MENU_PAGE_COUNT = 2

interface MenuCommandItem {
  command: CommandName
  enter?: boolean
}

const FIRST_PAGE_COMMANDS: MenuCommandItem[] = [
  { command: COMMAND_NAMES.buttonMenu },
  { command: COMMAND_NAMES.serverOverview },
  { command: COMMAND_NAMES.serverDetails },
  { command: COMMAND_NAMES.serverStatus },
  { command: COMMAND_NAMES.healthCheck },
  { command: COMMAND_NAMES.playerCount },
  { command: COMMAND_NAMES.playerHistory },
]

const SECOND_PAGE_COMMANDS: MenuCommandItem[] = [
  { command: COMMAND_NAMES.playerList },
  { command: COMMAND_NAMES.playerNames },
  { command: COMMAND_NAMES.playerStatistics },
  { command: COMMAND_NAMES.playerDetails, enter: false },
  { command: COMMAND_NAMES.bindPlayer, enter: false },
  { command: COMMAND_NAMES.unbindPlayer, enter: false },
]

export interface QQButtonMenu {
  markdown: string
  fallbackContent: string
  keyboard: QQKeyboard | null
}

export function buildQQButtonMenu(config: Config, page: 1 | 2): QQButtonMenu {
  const { rootCommand, featurePrefix } = resolveCommandScope(
    config.commandPrefix,
    config.useCommandPrefix,
  )
  const menuCommand = primaryCommand(featurePrefix, COMMAND_NAMES.buttonMenu)
  const featureButtons = page === 1
    ? [
        {
          label: `🎮 ${rootCommand}`,
          command: rootCommand,
          style: 1,
        },
        ...createFeatureButtons(featurePrefix, FIRST_PAGE_COMMANDS),
      ]
    : createFeatureButtons(featurePrefix, SECOND_PAGE_COMMANDS)
  const navigationButtons: CommandKeyboardButton[] = page === 1
    ? [
        { label: '❌ 上一页', command: `${menuCommand} 0`, style: 0 },
        { label: '下一页 ▶️', command: `${menuCommand} 2`, style: 1 },
      ]
    : [
        { label: '◀️ 上一页', command: `${menuCommand} 1`, style: 1 },
        { label: '❌ 下一页', command: `${menuCommand} 3`, style: 0 },
      ]

  const contentKeyboard = buildCommandKeyboard(config, featureButtons, 2)
  const navigationKeyboard = buildCommandKeyboard(config, navigationButtons, 2)
  const keyboard = contentKeyboard && navigationKeyboard
    ? { rows: [...contentKeyboard.rows, ...navigationKeyboard.rows] }
    : null
  const featurePrefixText = featurePrefix || '已关闭'
  const markdown = [
    '# ⌨️ 按钮菜单',
    '',
    `> 🎮 服务器：${escapeMarkdown(config.serverLabel)}`,
    `> 🔌 版本：v${CLIENT_VERSION}`,
    `> 🏷️ 主指令：${escapeMarkdown(rootCommand)}`,
    `> 🔗 功能前缀：${escapeMarkdown(featurePrefixText)}`,
    `> 📄 当前页：${page} / ${BUTTON_MENU_PAGE_COUNT}`,
    '',
    '请选择下方功能。',
  ].join('\n')

  return {
    markdown,
    fallbackContent: [
      `${config.serverLabel} ⌨️ 按钮菜单`,
      `版本：v${CLIENT_VERSION}`,
      `主指令：${rootCommand}`,
      `功能前缀：${featurePrefixText}`,
      `当前页：${page} / ${BUTTON_MENU_PAGE_COUNT}`,
    ].join('\n'),
    keyboard,
  }
}

function createFeatureButtons(prefix: string, items: MenuCommandItem[]): CommandKeyboardButton[] {
  return items.map(({ command, enter }) => ({
    label: `${command.emoji} ${command.primary}`,
    command: primaryCommand(prefix, command),
    style: 1,
    enter,
  }))
}
