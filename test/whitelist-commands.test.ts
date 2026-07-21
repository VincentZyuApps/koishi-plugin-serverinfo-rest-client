import { describe, expect, it, vi } from 'vitest'
import { registerWhitelistCommands } from '../src/commands/whitelist-commands'

function createHarness(configOverrides: Record<string, unknown> = {}) {
  const actions = new Map<string, Function>()
  const ctx = {
    command: vi.fn((declaration: string) => {
      const chain: any = {
        alias: vi.fn(() => chain),
        action: vi.fn((handler: Function) => {
          actions.set(declaration, handler)
          return chain
        }),
      }
      return chain
    }),
  } as any
  const api = { post: vi.fn() } as any
  const config = {
    whitelistBindingAuthority: 1,
    whitelistBindGroupOnly: true,
    whitelistUnbindGroupOnly: false,
    whitelistManagementAdminList: [],
    adminToken: 'admin-token',
    quoteCommandReplies: false,
    ...configOverrides,
  } as any
  registerWhitelistCommands(ctx, config, api, { error: vi.fn() }, 'mcinfo1')
  return { actions, api }
}

function session(isDirect: boolean) {
  return {
    isDirect, platform: 'qq', selfId: 'bot-1', userId: 'user-1',
    channelId: isDirect ? 'private-1' : 'group-1', bot: { selfId: 'bot-1' },
  } as any
}

describe('whitelist commands', () => {
  it('blocks binding in direct messages when bindGroupOnly is enabled', async () => {
    const { actions, api } = createHarness()
    const action = actions.get('mcinfo1.绑定白名单 <playerName:text>')!
    await expect(action({ session: session(true) }, 'Steve')).resolves.toBe('绑定白名单只能在群聊中使用')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('allows unbinding in direct messages by default and preserves admin grants', async () => {
    const { actions, api } = createHarness()
    api.post.mockResolvedValue({
      binding: { playerName: 'Steve' }, allowlistRetained: true, warning: '',
    })
    const action = actions.get('mcinfo1.解绑')!
    const result = await action({ session: session(true) })
    expect(api.post).toHaveBeenCalledWith('/whitelist/unbind', {
      platform: 'qq', selfId: 'bot-1', userId: 'user-1',
    }, true)
    expect(result).toContain('仍有管理员直接授权')
  })

  it('can independently restrict unbinding to groups', async () => {
    const { actions, api } = createHarness({ whitelistUnbindGroupOnly: true })
    const action = actions.get('mcinfo1.解绑')!
    await expect(action({ session: session(true) })).resolves.toBe('解绑白名单只能在群聊中使用')
    expect(api.post).not.toHaveBeenCalled()
  })
})
