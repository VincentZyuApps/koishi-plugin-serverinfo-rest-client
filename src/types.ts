import type { OverviewResponse } from './api/types'

export interface OnlineStatusResult {
  online: boolean
  checkedAt: number
  latencyMs: number
  overview?: OverviewResponse
  error?: string
}
