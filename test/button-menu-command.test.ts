import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildQQButtonMenu: vi.fn(),
  sendQQMarkdown: vi.fn(),
}))

vi.mock('../src/qq', () => ({
  BUTTON_MENU_PAGE_COUNT: 2,
  buildQQButtonMenu: mocks.buildQQButtonMenu,
  sendQQMarkdown: mocks.sendQQMarkdown,
}))

import { registerButtonMenuCommand } from '../src/commands/button-menu'

function createHarness(configOverrides: Record<string, unknown> = {}) {
  let action: Function | undefined
  const ctx = {
    logger: { info: vi.fn() },
    command: vi.fn((declaration: string) => {
      expect(declaration).toBe('mcinfo1.按钮菜单 [page:number]')
      const chain: any = {
        alias: vi.fn(() => chain),
        action: vi.fn((handler: Function) => {
          action = handler
          return chain
        }),
      }
      return chain
    }),
  } as any
  const config = {
    commandPrefix: 'mcinfo1',
    useCommandPrefix: true,
    serverLabel: '测试服',
    qqMarkdownEnabled: true,
    qqKeyboardEnabled: true,
    ...configOverrides,
  } as any
  registerButtonMenuCommand({
    ctx,
    config,
    apiClient: {} as any,
    rootCommand: 'mcinfo1',
    prefix: 'mcinfo1',
    label: '测试服',
  })
  return { action: action!, config, ctx }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.buildQQButtonMenu.mockReturnValue({
    markdown: '# menu',
    fallbackContent: 'menu',
    keyboard: { rows: [] },
  })
  mocks.sendQQMarkdown.mockResolvedValue(undefined)
})

describe('button menu command', () => {
  it('uses page one by default and sends QQ Markdown', async () => {
    const { action, config } = createHarness()
    const session = { platform: 'qq' } as any

    await expect(action({ session })).resolves.toBe('')

    expect(mocks.buildQQButtonMenu).toHaveBeenCalledWith(config, 1)
    expect(mocks.sendQQMarkdown).toHaveBeenCalledWith(
      expect.any(Object),
      config,
      session,
      '# menu',
      'menu',
      { rows: [] },
    )
  })

  it('rejects non-QQ platforms before building a menu', async () => {
    const { action } = createHarness()

    await expect(action({ session: { platform: 'qqguild' } })).resolves.toBe('❌ 按钮菜单仅支持 QQ 平台')
    expect(mocks.buildQQButtonMenu).not.toHaveBeenCalled()
  })

  it('reports both pagination boundaries', async () => {
    const { action } = createHarness()
    const context = { session: { platform: 'qq' } }

    await expect(action(context, 0)).resolves.toBe('❌ 已经是第一页了')
    await expect(action(context, 3)).resolves.toBe('❌ 已经是最后一页了')
    expect(mocks.buildQQButtonMenu).not.toHaveBeenCalled()
  })

  it('requires an integer page and enabled QQ buttons', async () => {
    const enabled = createHarness()
    await expect(enabled.action({ session: { platform: 'qq' } }, 1.5))
      .resolves.toBe('❌ 页码只能是 1 或 2')

    const disabled = createHarness({ qqKeyboardEnabled: false })
    await expect(disabled.action({ session: { platform: 'qq' } }))
      .resolves.toBe('❌ QQ 按钮已关闭，无法发送按钮菜单')
  })

  it('sends the explicit button menu when automatic QQ Markdown output is disabled', async () => {
    const { action, config } = createHarness({ qqMarkdownEnabled: false })

    await expect(action({ session: { platform: 'qq' } })).resolves.toBe('')
    expect(mocks.buildQQButtonMenu).toHaveBeenCalledWith(config, 1)
    expect(mocks.sendQQMarkdown).toHaveBeenCalledOnce()
  })
})
