import type { Context } from 'koishi'
import type { Config } from './config'

export function logInfo(
  ctx: Context,
  config: Config,
  msg1: string,
  msg2?: string,
  verbose = false,
) {
  ctx.logger.info(msg1)
  if (msg2 && (config.verboseConsoleLog || verbose)) ctx.logger.info(msg2)
}

function jsonReplacer(_key: string, value: unknown) {
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  return value
}

export function stringifyForLog(value: unknown): string {
  try {
    return JSON.stringify(value, jsonReplacer) ?? String(value)
  } catch {
    return String(value)
  }
}

export function formatErrorForLog(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message
  return stringifyForLog(error)
}
