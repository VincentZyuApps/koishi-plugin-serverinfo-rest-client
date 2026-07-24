import { describe, expect, it, vi } from 'vitest'
import { formatErrorForLog, logInfo, stringifyForLog } from '../src/logger'

function createContext() {
  const info = vi.fn()
  return { ctx: { logger: { info } } as any, info }
}

describe('logInfo', () => {
  it('always writes msg1 and hides msg2 by default', () => {
    const { ctx, info } = createContext()

    logInfo(ctx, { verboseConsoleLog: false } as any, '摘要', '详细信息')

    expect(info).toHaveBeenCalledTimes(1)
    expect(info).toHaveBeenCalledWith('摘要')
  })

  it('writes msg2 when verbose logging is enabled', () => {
    const { ctx, info } = createContext()

    logInfo(ctx, { verboseConsoleLog: true } as any, '摘要', '详细信息')

    expect(info.mock.calls).toEqual([['摘要'], ['详细信息']])
  })

  it('allows a call site to force msg2 output', () => {
    const { ctx, info } = createContext()

    logInfo(ctx, { verboseConsoleLog: false } as any, '摘要', '详细信息', true)

    expect(info.mock.calls).toEqual([['摘要'], ['详细信息']])
  })

  it('serializes bigint and errors without throwing', () => {
    const error = new Error('测试错误')
    const serialized = stringifyForLog({ count: 1n, error })

    expect(serialized).toContain('"count":"1"')
    expect(serialized).toContain('"message":"测试错误"')
    expect(formatErrorForLog(error)).toContain('测试错误')
    expect(stringifyForLog(undefined)).toBe('undefined')
  })
})
