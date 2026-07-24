import type { Context } from 'koishi'
import type { ApiClient } from '../api/client'
import type { Config } from '../config'

export interface CommandRegistrationContext {
  ctx: Context
  config: Config
  apiClient: ApiClient
  rootCommand: string
  prefix: string
  label: string
}
