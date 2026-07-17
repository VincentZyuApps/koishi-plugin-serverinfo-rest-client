import type { Config } from '../config'

export interface ApiClient {
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T>
  post<T>(endpoint: string, body: unknown, admin?: boolean): Promise<T>
  getBaseUrl(): string
  getApiBase(): string
}

export function createApiClient(config: Config, logger: any): ApiClient {
  const baseUrl = config.serverUrl.replace(/\/+$/, '')
  const apiPrefix = config.apiPrefix.startsWith('/') ? config.apiPrefix : `/${config.apiPrefix}`
  const apiBase = `${baseUrl}${apiPrefix.replace(/\/+$/, '')}`

  function buildUrl(endpoint: string, params?: Record<string, string>): string {
    const queryString = Object.entries(params ?? {})
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return queryString ? `${endpoint}?${queryString}` : endpoint
  }

  async function request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown,
    admin = false,
  ): Promise<T> {
    const url = buildUrl(`${apiBase}${endpoint}`, params)
    logger.debug(`[API] ${method} ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'koishi-plugin-serverinfo-rest-client/1.0',
          'Accept': 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...((admin ? config.adminToken : config.token)
            ? { 'Authorization': `Bearer ${admin ? config.adminToken : config.token}` }
            : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      })

      const responseText = await response.text()
      let data: any = null
      try {
        data = responseText ? JSON.parse(responseText) : null
      } catch {
        data = responseText
      }
      if (!response.ok) {
        const detail = typeof data === 'object' && data
          ? data.error || data.warning || data.commandOutput || data.output
          : data
        throw new Error(`HTTP ${response.status}: ${detail || response.statusText}`)
      }

      logger.debug('[API] Response:', JSON.stringify(data).substring(0, 200))
      return data as T
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`请求超时 (${config.timeout}ms)`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  function get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return request<T>('GET', endpoint, params)
  }

  function post<T>(endpoint: string, body: unknown, admin = false): Promise<T> {
    return request<T>('POST', endpoint, undefined, body, admin)
  }

  return {
    get,
    post,
    getBaseUrl: () => baseUrl,
    getApiBase: () => apiBase,
  }
}
