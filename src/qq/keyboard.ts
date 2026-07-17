import type { Config } from '../config'
import type { QQKeyboard } from './types'

export interface CommandKeyboardButton {
  label: string
  command: string
  style?: number
}

export const DEFAULT_QQ_KEYBOARD: QQKeyboard = {
  rows: [{
    buttons: [
      {
        render_data: { label: '🔄 刷新状态', style: 1 },
        action: { type: 2, permission: { type: 2 }, data: '${commandPrefix}.查在线', enter: true },
      },
      {
        render_data: { label: '❓ 使用帮助', style: 0 },
        action: { type: 2, permission: { type: 2 }, data: '${commandPrefix} --help', enter: true },
      },
    ],
  }],
}

export function buildQQKeyboard(config: Config): QQKeyboard | null {
  if (!config.qqMarkdownKeyboardEnabled) return null
  const source = config.qqMarkdownKeyboardJson || stringifyKeyboard(DEFAULT_QQ_KEYBOARD)
  const resolved = source
    .replace(/\$\{commandPrefix\}/g, config.commandPrefix)
    .replace(/\$\{serverLabel\}/g, config.serverLabel)
  try {
    const parsed = JSON.parse(resolved)
    if (Array.isArray(parsed?.rows) && parsed.rows.every(row => Array.isArray(row?.buttons))) {
      return parsed
    }
  } catch {}
  return JSON.parse(
    stringifyKeyboard(DEFAULT_QQ_KEYBOARD)
      .replace(/\$\{commandPrefix\}/g, config.commandPrefix)
      .replace(/\$\{serverLabel\}/g, config.serverLabel),
  )
}

export function stringifyKeyboard(value: QQKeyboard): string {
  return JSON.stringify(value, null, 2)
}

export function buildCommandKeyboard(
  config: Config,
  buttons: CommandKeyboardButton[],
): QQKeyboard | null {
  if (!config.qqMarkdownKeyboardEnabled || !buttons.length) return null
  const rows: QQKeyboard['rows'] = []
  for (let index = 0; index < buttons.length; index += 2) {
    rows.push({
      buttons: buttons.slice(index, index + 2).map(button => ({
        render_data: { label: button.label, style: button.style ?? 0 },
        action: {
          type: 2,
          permission: { type: 2 },
          data: button.command,
          enter: true,
        },
      })),
    })
  }
  return { rows }
}
