import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../src/api/client'

const logger = { debug: vi.fn() }
const config = {
  serverUrl: 'https://example.test/', apiPrefix: '/api/v1/', timeout: 1000,
  token: 'read-token', adminToken: 'admin-token',
} as any

afterEach(() => vi.unstubAllGlobals())

describe('createApiClient', () => {
  it('normalizes URLs and sends the read token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = createApiClient(config, logger)
    await client.get('/players/stats', { name: 'A B' })

    expect(client.getBaseUrl()).toBe('https://example.test')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v1/players/stats?name=A%20B',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer read-token' }) }),
    )
  })

  it('sends JSON and the independent admin token for writes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"created":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient(config, logger).post('/whitelist/add', { playerName: 'Steve' }, true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v1/whitelist/add',
      expect.objectContaining({
        method: 'POST',
        body: '{"playerName":"Steve"}',
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      }),
    )
  })

  it('surfaces structured HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"denied"}', {
      status: 403, statusText: 'Forbidden',
    })))
    await expect(createApiClient(config, logger).get('/status')).rejects.toThrow('HTTP 403: denied')
  })
})
