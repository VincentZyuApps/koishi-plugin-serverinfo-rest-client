import { describe, expect, it, vi } from 'vitest'
import { TypstRenderer } from '../src/index'

describe('TypstRenderer', () => {
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
