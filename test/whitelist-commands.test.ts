import { describe, expect, it, vi } from 'vitest'
import { parseTargetUserId, registerWhitelistCommands } from '../src/commands/whitelist-commands'

function createHarness(configOverrides: Record<string, unknown> = {}) {
  const actions = new Map<string, Function>()
  const ctx = {
    command: vi.fn((declaration: string) => {
      const chain: any = {
        alias: vi.fn(() => chain),
        option: vi.fn(() => chain),
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
    whitelistManagementAdminList: [{
      platform: 'qq', selfId: 'bot-1', channelId: 'group-1', userId: 'admin-1', enabled: true,
    }],
    adminToken: 'admin-token',
    quoteCommandReplies: false,
    ...configOverrides,
  } as any
  registerWhitelistCommands(ctx, config, api, { error: vi.fn() }, 'mcinfo1')
  return { actions, api }
}

function session(isDirect: boolean, userId = 'user-1') {
  return {
    isDirect, platform: 'qq', selfId: 'bot-1', userId,
    channelId: isDirect ? 'private-1' : 'group-1', bot: { selfId: 'bot-1' },
  } as any
}

describe('whitelist commands', () => {
  it('blocks binding in direct messages when bindGroupOnly is enabled', async () => {
    const { actions, api } = createHarness()
    const action = actions.get('mcinfo1.绑定玩家 <playerName:text>')!
    await expect(action({ session: session(true) }, 'Steve')).resolves.toBe('绑定玩家只能在群聊中使用')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('allows unbinding in direct messages and removes the only binding', async () => {
    const { actions, api } = createHarness()
    api.post.mockResolvedValue({
      binding: { playerName: 'Steve' }, warning: '',
    })
    const action = actions.get('mcinfo1.解绑玩家')!
    const result = await action({ session: session(true) })
    expect(api.post).toHaveBeenCalledWith('/whitelist/unbind', {
      platform: 'qq', selfId: 'bot-1', userId: 'user-1',
    }, true)
    expect(result).toBe('已解除与 Steve 的玩家绑定')
  })

  it('can independently restrict unbinding to groups', async () => {
    const { actions, api } = createHarness({ whitelistUnbindGroupOnly: true })
    const action = actions.get('mcinfo1.解绑玩家')!
    await expect(action({ session: session(true) })).resolves.toBe('解绑玩家只能在群聊中使用')
    expect(api.post).not.toHaveBeenCalled()
  })

  it('parses mentions and non-numeric platform user IDs', () => {
    expect(parseTargetUserId('<at id="DEF7AD72F48937DF"/>')).toBe('DEF7AD72F48937DF')
    expect(parseTargetUserId('DEF7AD72F48937DF')).toBe('DEF7AD72F48937DF')
    expect(parseTargetUserId('two user ids')).toBe('')
  })

  it('lets an administrator force-bind a mentioned user in the current session scope', async () => {
    const { actions, api } = createHarness()
    api.post.mockResolvedValue({
      created: true,
      forced: true,
      binding: { userId: 'target-user-id', playerName: 'Steve' },
      replacedBindings: [{ userId: 'old-user-id', playerName: 'Steve' }],
    })
    const action = actions.get('mcinfo1.添加白名单 <playerName:string> <targetUser:text>')!
    const result = await action(
      { session: session(false, 'admin-1'), options: { force: true } },
      'Steve',
      '<at id="target-user-id"/>',
    )

    expect(api.post).toHaveBeenCalledWith('/whitelist/add', {
      platform: 'qq',
      selfId: 'bot-1',
      userId: 'target-user-id',
      channelId: 'group-1',
      playerName: 'Steve',
      requester: 'qq:bot-1:admin-1:group-1',
      force: true,
    }, true)
    expect(result).toContain('已强制创建绑定')
    expect(result).toContain('old-...r-id')
  })

  it('keeps administrator replacement disabled unless force is explicit', async () => {
    const { actions, api } = createHarness()
    api.post.mockResolvedValue({
      created: true,
      forced: false,
      binding: { userId: 'target-user-id', playerName: 'Alex' },
      replacedBindings: [],
    })
    const action = actions.get('mcinfo1.添加白名单 <playerName:string> <targetUser:text>')!
    await action(
      { session: session(false, 'admin-1'), options: {} },
      'Alex',
      'target-user-id',
    )

    expect(api.post).toHaveBeenCalledWith('/whitelist/add', expect.objectContaining({
      playerName: 'Alex',
      userId: 'target-user-id',
      force: false,
    }), true)
  })

  it('shows a masked binding state to an administrator', async () => {
    const { actions, api } = createHarness()
    api.post.mockResolvedValue({
      bound: true,
      binding: {
        platform: 'qq', selfId: '7740499484692077389',
        userId: 'DEF7AD72F48937DF174643A37ED8817D', playerName: 'Steve',
      },
    })
    const action = actions.get('mcinfo1.查询白名单绑定 <playerName:text>')!
    const result = await action({ session: session(false, 'admin-1') }, 'Steve')

    expect(api.post).toHaveBeenCalledWith('/whitelist/state', { playerName: 'Steve' }, true)
    expect(result).toContain('DEF7...817D')
    expect(result).not.toContain('DEF7AD72F48937DF174643A37ED8817D')
  })

  it('removes the unique player binding as an administrator', async () => {
    const { actions, api } = createHarness()
    api.post.mockResolvedValue({ binding: { userId: 'target-user-id', playerName: 'Steve' } })
    const action = actions.get('mcinfo1.移除白名单 <playerName:text>')!
    const result = await action({ session: session(false, 'admin-1') }, 'Steve')

    expect(api.post).toHaveBeenCalledWith('/whitelist/remove', {
      playerName: 'Steve', requester: 'qq:bot-1:admin-1:group-1',
    }, true)
    expect(result).toContain('已移除绑定')
  })
})
