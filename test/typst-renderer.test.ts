import { describe, expect, it, vi } from 'vitest'
import { buildTypstTheme, TypstRenderer } from '../src/index'

describe('TypstRenderer', () => {
  it('uses the LeviLamina green theme by default and accepts overrides', () => {
    const defaults = buildTypstTheme({} as any)
    expect(defaults.headerFill).toBe('rgb("#2c5e3b")')
    expect(defaults.headerStroke).toBe('rgb("#7fa973")')
    expect(defaults.pageBg).toBe('rgb("#f2f6f1")')

    const customized = buildTypstTheme({ typstHeaderFillColor: '#123456' } as any)
    expect(customized.headerFill).toBe('rgb("#123456")')
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
})
