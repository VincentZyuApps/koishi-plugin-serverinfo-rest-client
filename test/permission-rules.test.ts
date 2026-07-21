import { describe, expect, it } from 'vitest'
import { hasPermission } from '../src/permissions'

describe('hasPermission', () => {
  const session = {
    platform: 'qq',
    selfId: 'bot-1',
    userId: 'user-1',
    channelId: 'group-1',
  } as any

  it('matches userId exactly and treats empty scopes as wildcards', () => {
    expect(hasPermission(session, [{
      platform: '', selfId: '', channelId: '', userId: 'user-1', enabled: true,
    }])).toBe(true)
    expect(hasPermission(session, [{
      platform: '', selfId: '', channelId: '', userId: 'user-2', enabled: true,
    }])).toBe(false)
  })

  it('honors every configured scope and enabled flag', () => {
    expect(hasPermission(session, [{
      platform: 'qq', selfId: 'bot-1', channelId: 'group-1', userId: 'user-1', enabled: true,
    }])).toBe(true)
    expect(hasPermission(session, [{
      platform: 'qq', selfId: 'bot-1', channelId: 'other', userId: 'user-1', enabled: true,
    }])).toBe(false)
    expect(hasPermission(session, [{
      platform: 'qq', selfId: 'bot-1', channelId: 'group-1', userId: 'user-1', enabled: false,
    }])).toBe(false)
  })
})
