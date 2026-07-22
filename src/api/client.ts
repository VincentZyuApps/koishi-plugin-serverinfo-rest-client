import type { Config, TokenSendMode } from '../config'

export interface ApiClient {
  get<T>(endpoint: string, params?: Record<string, string>): Promise<T>
  post<T>(endpoint: string, body: unknown, admin?: boolean): Promise<T>
  getBaseUrl(): string
  getApiBase(): string
}

export class ApiRequestError extends Error {
  readonly name = 'ApiRequestError'
  readonly code?: string

  constructor(
    readonly status: number,
    readonly detail: string,
    readonly responseData: unknown,
  ) {
    super(`HTTP ${status}: ${detail}`)
    this.code = typeof responseData === 'object' && responseData
      && typeof (responseData as Record<string, unknown>).code === 'string'
      ? (responseData as Record<string, string>).code
      : undefined
  }
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

  function normalizeSendMode(value: TokenSendMode | undefined): TokenSendMode {
    return value === 'param' || value === 'both' ? value : 'header'
  }

  function includesParam(mode: TokenSendMode): boolean {
    return mode === 'param' || mode === 'both'
  }

  function includesHeader(mode: TokenSendMode): boolean {
    return mode === 'header' || mode === 'both'
  }

  function redactUrl(url: string): string {
    return url.replace(/([?&]token=)[^&]*/gi, '$1***')
  }

  async function request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    params?: Record<string, string>,
    body?: unknown,
    admin = false,
  ): Promise<T> {
    const authToken = admin ? config.adminToken : config.token
    const sendMode = normalizeSendMode(admin ? config.adminTokenSendMode : config.tokenSendMode)
    const queryParams = { ...(params ?? {}) }
    if (authToken && includesParam(sendMode)) queryParams.token = authToken
    const url = buildUrl(`${apiBase}${endpoint}`, queryParams)
    logger.debug(`[API] ${method} ${redactUrl(url)}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'User-Agent': 'koishi-plugin-serverinfo-rest-client/1.0',
          'Accept': 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authToken && includesHeader(sendMode)
            ? { 'Authorization': `Bearer ${authToken}` }
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
        throw new ApiRequestError(
          response.status,
          String(detail || response.statusText),
          data,
        )
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
