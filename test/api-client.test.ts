import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient } from '../src/api/client'

const logger = { debug: vi.fn() }
const config = {
  serverUrl: 'https://example.test/', apiPrefix: '/api/v2/', timeout: 1000,
  token: 'read-token', tokenSendMode: 'header',
  adminToken: 'admin-token', adminTokenSendMode: 'header',
} as any

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createApiClient', () => {
  it('normalizes URLs and sends the read token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = createApiClient(config, logger)
    await client.get('/players/stats', { name: 'A B' })

    expect(client.getBaseUrl()).toBe('https://example.test')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v2/players/stats?name=A%20B',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer read-token' }) }),
    )
  })

  it('sends JSON and the independent admin token for writes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"created":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient(config, logger).post('/whitelist/add', { playerName: 'Steve' }, true)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.test/api/v2/whitelist/add',
      expect.objectContaining({
        method: 'POST',
        body: '{"playerName":"Steve"}',
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      }),
    )
  })

  it('sends the read token as a URL parameter without leaking it to logs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient({ ...config, tokenSendMode: 'param' }, logger)
      .get('/players/stats', { name: 'A B' })

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v2/players/stats?name=A%20B&token=read-token')
    expect(options.headers.Authorization).toBeUndefined()
    expect(logger.debug.mock.calls.flat().join(' ')).toContain('token=***')
    expect(logger.debug.mock.calls.flat().join(' ')).not.toContain('read-token')
  })

  it('sends the admin token in both supported locations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient({ ...config, adminTokenSendMode: 'both' }, logger)
      .post('/whitelist/add', { playerName: 'Steve' }, true)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v2/whitelist/add?token=admin-token')
    expect(options.headers.Authorization).toBe('Bearer admin-token')
    expect(logger.debug.mock.calls.flat().join(' ')).not.toContain('admin-token')
  })

  it('sends the read token in both supported locations', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient({ ...config, tokenSendMode: 'both' }, logger).get('/status')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v2/status?token=read-token')
    expect(options.headers.Authorization).toBe('Bearer read-token')
  })

  it('sends the admin token only as a URL parameter when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient({ ...config, adminTokenSendMode: 'param' }, logger)
      .post('/whitelist/remove', { playerName: 'Steve' }, true)

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v2/whitelist/remove?token=admin-token')
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('does not send authentication fields when the selected token is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createApiClient({ ...config, token: '', tokenSendMode: 'both' }, logger).get('/status')

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/api/v2/status')
    expect(options.headers.Authorization).toBeUndefined()
  })

  it('surfaces structured HTTP errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"code":"binding_not_found","error":"denied"}', {
      status: 403, statusText: 'Forbidden',
    })))
    await expect(createApiClient(config, logger).get('/status')).rejects.toMatchObject({
      status: 403,
      code: 'binding_not_found',
      detail: 'denied',
    })
  })
})
