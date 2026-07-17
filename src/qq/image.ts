import type { ImageDimensions } from './types'

export function getPngDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length >= 24
    && buffer[0] === 0x89
    && buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }
  return { width: 900, height: 560 }
}

export function fitQQMarkdownImage(dimensions: ImageDimensions): ImageDimensions {
  const width = Math.max(1, Math.min(900, dimensions.width))
  return {
    width,
    height: Math.max(1, Math.round(dimensions.height * width / dimensions.width)),
  }
}
