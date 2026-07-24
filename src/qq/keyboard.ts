import type { Config } from '../config'
import { resolveCommandScope } from '../commands/command-names'
import type { QQKeyboard } from './types'

export interface CommandKeyboardButton {
  label: string
  command: string
  style?: number
  enter?: boolean
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
  if (!config.qqKeyboardEnabled) return null
  const source = config.qqMarkdownKeyboardJson || stringifyKeyboard(DEFAULT_QQ_KEYBOARD)
  const resolved = resolveKeyboardTemplate(source, config)
  try {
    const parsed = JSON.parse(resolved)
    if (Array.isArray(parsed?.rows) && parsed.rows.every(row => Array.isArray(row?.buttons))) {
      return parsed
    }
  } catch {}
  return JSON.parse(resolveKeyboardTemplate(stringifyKeyboard(DEFAULT_QQ_KEYBOARD), config))
}

function resolveKeyboardTemplate(source: string, config: Config): string {
  const { rootCommand, featurePrefix } = resolveCommandScope(config.commandPrefix, config.useCommandPrefix)
  const featureCommandPrefix = featurePrefix ? `${featurePrefix}.` : ''
  return source
    .replace(/\$\{commandPrefix\}\./g, featureCommandPrefix)
    .replace(/\$\{commandPrefix\}/g, rootCommand)
    .replace(/\$\{serverLabel\}/g, config.serverLabel)
}

export function stringifyKeyboard(value: QQKeyboard): string {
  return JSON.stringify(value, null, 2)
}

export function buildCommandKeyboard(
  config: Config,
  buttons: CommandKeyboardButton[],
  columns = 2,
): QQKeyboard | null {
  if (!config.qqKeyboardEnabled || !buttons.length) return null
  const columnCount = Math.max(1, Math.min(5, Math.floor(columns)))
  const rows: QQKeyboard['rows'] = []
  for (let index = 0; index < buttons.length; index += columnCount) {
    rows.push({
      buttons: buttons.slice(index, index + columnCount).map(button => ({
        render_data: { label: button.label, style: button.style ?? 0 },
        action: {
          type: 2,
          permission: { type: 2 },
          data: button.command,
          enter: button.enter ?? true,
        },
      })),
    })
  }
  return { rows }
}
