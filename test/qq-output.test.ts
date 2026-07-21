import { describe, expect, it, vi } from 'vitest'
import { buildQQKeyboard } from '../src/qq/keyboard'
import { sendQQMarkdown } from '../src/qq/markdown'
import { formatQQOnlineMarkdown } from '../src/qq/template'

describe('QQ Markdown and keyboard', () => {
  const config = {
    commandPrefix: 'mcinfo2', serverLabel: '二服', qqMarkdownKeyboardEnabled: true,
    qqMarkdownKeyboardJson: '', qqMarkdownMaxPlayers: 2,
  } as any

  it('expands the reusable command prefix in keyboard actions', () => {
    const keyboard = buildQQKeyboard(config)!
    expect(keyboard.rows[0].buttons[0].action.data).toBe('mcinfo2.查在线')
  })

  it('builds public image Markdown and truncates long player lists', () => {
    const markdown = formatQQOnlineMarkdown({
      online: true,
      latencyMs: 12,
      overview: { players: { online: 3, max: 20, names: ['A', 'B', 'C'] } },
    } as any, config, 'https://cdn.example/status.png', { width: 800, height: 450 })
    expect(markdown).toContain('https://cdn.example/status.png')
    expect(markdown).toContain('还有 1 名玩家未显示')
  })

  it('uses the official adapter internal API for direct replies', async () => {
    const sendPrivateMessage = vi.fn().mockResolvedValue(undefined)
    const session = {
      isDirect: true, channelId: 'private-1', messageId: 'message-1', timestamp: Date.now(),
      bot: { internal: { sendPrivateMessage } },
    } as any
    await sendQQMarkdown(session, '# status', 'status', buildQQKeyboard(config))
    expect(sendPrivateMessage).toHaveBeenCalledWith('private-1', expect.objectContaining({
      msg_type: 2,
      markdown: { content: '# status' },
      keyboard: expect.any(Object),
    }))
  })

  it('uses qq:rawmarkdown when the adapter exposes autoStreamText', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const session = { bot: { config: { autoStreamText: true } }, send } as any
    await sendQQMarkdown(session, '# status', 'status', buildQQKeyboard(config))
    expect(send).toHaveBeenCalledOnce()
  })
})
