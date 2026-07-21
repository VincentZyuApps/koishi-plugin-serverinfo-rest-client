import type { Context } from 'koishi'
import type { Config } from '../config'
import type { ApiClient } from '../api/client'
import type { OverviewResponse } from '../api/types'
import { aliasCommand, COMMAND_NAMES, commandDescription, primaryCommand } from './command-names'
import type { OnlineStatusResult } from '../types'
import { renderTypstTemplate } from '../index'
import { sendOnlineStatus } from '../qq'

function createTemplatePayload(config: Config, result: OnlineStatusResult) {
  const overview = result.overview
  const tps = overview?.tps
  return {
    label: config.serverLabel,
    online: result.online && !!overview,
    error: result.error || '服务器接口暂时不可用',
    latency_ms: result.latencyMs,
    checked_at: new Date(result.checkedAt).toLocaleString('zh-CN'),
    online_players: overview?.players.online ?? 0,
    max_players: overview?.players.max ?? 0,
    tps_color: !tps ? '#c53030' : tps.avg10s >= 18 ? '#2f855a' : tps.avg10s >= 15 ? '#b7791f' : '#c53030',
    tps: {
      realtime: tps?.realtime.toFixed(2) ?? '0.00',
      avg10s: tps?.avg10s.toFixed(2) ?? '0.00',
      avg60s: tps?.avg60s.toFixed(2) ?? '0.00',
      avg300s: tps?.avg300s.toFixed(2) ?? '0.00',
      sampled_seconds: tps?.sampledSeconds ?? 0,
    },
    versions: {
      bds: overview?.versions.bds ?? '未知',
      protocol: overview?.versions.protocol ?? 0,
      levilamina: overview?.versions.levilamina ?? '未知',
      plugin: overview?.versions.plugin ?? '未知',
    },
  }
}

async function renderOnlineStatus(
  ctx: Context,
  config: Config,
  result: OnlineStatusResult,
  logger: any,
): Promise<Buffer> {
  return renderTypstTemplate(ctx, config, logger, 'onlineStatus', createTemplatePayload(config, result))
}

export function registerOnlineCommand(
  ctx: Context,
  config: Config,
  apiClient: ApiClient,
  logger: any,
  prefix: string,
) {
  ctx.command(primaryCommand(prefix, COMMAND_NAMES.online), commandDescription(COMMAND_NAMES.online, '查询服务器在线状态'))
    .alias(aliasCommand(prefix, COMMAND_NAMES.online))
    .action(async ({ session }) => {
      const startedAt = Date.now()
      let result: OnlineStatusResult
      try {
        const overview = await apiClient.get<OverviewResponse>('/overview')
        result = {
          online: true,
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          overview,
        }
      } catch (error) {
        result = {
          online: false,
          checkedAt: Date.now(),
          latencyMs: Date.now() - startedAt,
          error: sanitizeError(error),
        }
      }

      let image: Buffer | null = null
      try {
        image = await renderOnlineStatus(ctx, config, result, logger)
      } catch (error) {
        logger.warn(`查在线 Typst 渲染失败: ${error}`)
      }
      return sendOnlineStatus(ctx, session, config, result, image, logger)
    })
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/https?:\/\/\S+/gi, '服务器接口')
    .replace(/token=[^&\s]+/gi, 'token=***')
    .slice(0, 160)
}
