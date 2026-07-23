import type { Context } from 'koishi'
import type { ApiClient } from '../api/client'
import type { Config } from '../config'

export interface CommandRegistrationContext {
  ctx: Context
  config: Config
  apiClient: ApiClient
  logger: ReturnType<Context['logger']>
  rootCommand: string
  prefix: string
  label: string
}
