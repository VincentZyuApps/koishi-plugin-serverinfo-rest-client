import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { describe, expect, it, vi } from 'vitest'
import { buildTypstTheme, TypstRenderer } from '../src/index'
import { ensureTemplateAssets, TEMPLATE_ENTRIES } from '../src/template-assets'

const templateConfig = {
  typstFontPath: '',
  typstEmojiFontPath: '',
  typstFontFamily: 'Arial',
  typstTemplateFolderRelativePath: ['runtime', 'templates'],
  typstTransparentBackground: false,
  typstPageBgColor: '#f2f6f1',
  typstTextColor: '#26332b',
  typstHeaderFillColor: '#2c5e3b',
  typstHeaderStrokeColor: '#7fa973',
  typstHeaderTextColor: '#ffffff',
  typstPanelFillColor: '#ffffff',
  typstPanelStrokeColor: '#cbd9ce',
  typstSectionTitleColor: '#2c5e3b',
  typstStatsTextColor: '#66746b',
} as any

describe('TypstRenderer', () => {
  it('uses the LeviLamina green theme by default and accepts overrides', () => {
    const defaults = buildTypstTheme({} as any)
    expect(defaults.headerFill).toBe('rgb("#2c5e3b")')
    expect(defaults.headerStroke).toBe('rgb("#7fa973")')
    expect(defaults.pageBg).toBe('rgb("#f2f6f1")')

    const customized = buildTypstTheme({ typstHeaderFillColor: '#123456' } as any)
    expect(customized.headerFill).toBe('rgb("#123456")')

    const transparent = buildTypstTheme({ typstTransparentBackground: true } as any)
    expect(transparent.pageBg).toBe('none')
  })

  it('renders a non-empty PNG through Typst and Resvg', async () => {
    const renderer = new TypstRenderer(
      { baseDir: process.cwd() } as any,
      { info: vi.fn(), warn: vi.fn() },
      { typstFontPath: '', typstEmojiFontPath: '' } as any,
    )
    await renderer.init()
    const png = await renderer.toPng(`
#set page(width: 120pt, height: 60pt, margin: 0pt)
#rect(width: 120pt, height: 60pt, fill: rgb("#5dade2"))
`, 1)
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.length).toBeGreaterThan(100)
  }, 30_000)

  it('compiles every bundled runtime template with structured JSON input', async () => {
    const baseDir = await mkdtemp(path.join(process.env.TEMP || process.cwd(), 'll-serverinfo-template-test-'))
    const ctx = { baseDir } as any
    const logger = { info: vi.fn(), warn: vi.fn() }
    const payloads: Record<keyof typeof TEMPLATE_ENTRIES, Record<string, unknown>> = {
      healthStatus: {
        label: '测试服 [安全文本]', status_emoji: '✅', status_text: '健康',
        timestamp: '2026/07/22 12:00:00', uptime: '1小时', generated_at: '2026/07/22 12:00:00',
      },
      onlineStatus: {
        label: '测试服', online: true, error: '', latency_ms: 12, checked_at: '2026/07/22 12:00:00',
        online_players: 2, max_players: 20, tps_color: '#2f855a',
        tps: { realtime: '20.00', avg10s: '19.99', avg60s: '19.98', avg300s: '19.97', sampled_seconds: 300 },
        versions: { bds: '1.26.10.4', protocol: 944, levilamina: '26.10.14', plugin: '0.2.4' },
      },
      playerHistory: {
        label: '测试服', total: 1, page: 1, page_count: 1,
        players: [{ number: 1, name: 'Steve', total_play: '2小时', last_seen: '2026/07/22 12:00' }],
      },
      playerStats: {
        label: '测试服', name: 'Steve', xuid: '123456', total_play: '2小时', blocks_mined: '1,234',
        mobs_killed: '56', join_count: '7', first_seen: '2026/07/20', last_seen: '2026/07/22',
      },
      playerDetail: {
        label: '测试服', name: 'Steve', xuid: '123456', uuid: 'uuid-value', locale: 'zh_CN',
        operator: '否', position: '1.0, 64.0, 2.0',
      },
      playersList: { label: '测试服', count: 1, players: [{ name: 'Steve' }] },
      playersCount: { label: '测试服', count: 1, generated_at: '2026/07/22 12:00:00' },
      playerNames: { label: '测试服', count: 1, names: ['Steve'], generated_at: '2026/07/22 12:00:00' },
      serverInfo: {
        label: '测试服', status: 'online', level_name: 'Bedrock level', online_players: 1, max_players: 20,
        bds_version: '1.26.10.4', protocol_version: 944, levilamina_version: '26.10.14', plugin_version: '0.2.4',
      },
      serverStatus: {
        label: '测试服', status_emoji: '🟢', status: 'online', plugin: 'serverinfo-rest', plugin_version: '0.2.4',
        client_version: '0.2.4', player_count: 1, bds_version: '1.26.10.4', protocol_version: 944,
        generated_at: '2026/07/22 12:00:00',
      },
    }

    try {
      await ensureTemplateAssets(ctx, templateConfig)
      const renderer = new TypstRenderer(ctx, logger, templateConfig)
      await renderer.init()
      for (const template of Object.keys(TEMPLATE_ENTRIES) as Array<keyof typeof TEMPLATE_ENTRIES>) {
        let png: Buffer
        try {
          png = await renderer.toTemplatePng(template, payloads[template], 1)
        } catch (error) {
          const detail = error instanceof Error
            ? (error.message || String((error as Error & { code?: string }).code || error))
            : String(error)
          throw new Error(`${template}: ${detail}`)
        }
        expect(png.subarray(0, 8).toString('hex'), template).toBe('89504e470d0a1a0a')
        expect(png.length, template).toBeGreaterThan(100)
        const width = png.readUInt32BE(16)
        const height = png.readUInt32BE(20)
        expect(height, `${template} should use content-height pages`).toBeLessThan(width)
      }

      const conditionalVariants: Array<[keyof typeof TEMPLATE_ENTRIES, Record<string, unknown>]> = [
        ['onlineStatus', { ...payloads.onlineStatus, online: false, error: '连接超时' }],
        ['playerDetail', { ...payloads.playerDetail, position: null }],
        ['playersList', { ...payloads.playersList, count: 0, players: [] }],
        ['playerNames', { ...payloads.playerNames, count: 0, names: [] }],
      ]
      for (const [template, payload] of conditionalVariants) {
        const png = await renderer.toTemplatePng(template, payload, 1)
        expect(png.subarray(0, 8).toString('hex'), `${template} conditional variant`).toBe('89504e470d0a1a0a')
      }

      const transparentRenderer = new TypstRenderer(ctx, logger, {
        ...templateConfig,
        typstTransparentBackground: true,
      })
      await transparentRenderer.init()
      const transparentPng = await transparentRenderer.toTemplatePng('playersCount', payloads.playersCount, 1)
      expect(transparentPng.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    } finally {
      await rm(baseDir, { recursive: true, force: true })
    }
  }, 120_000)
})
