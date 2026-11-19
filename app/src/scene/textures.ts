/**
 * Procedural textures. Everything is drawn at runtime so the app ships no image assets.
 */
import {
  CanvasTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { mulberry32 } from '../core/ink'
import { CELL_H, CELL_W } from './constants'

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas is not available')
  return [c, ctx]
}

/** Warm paper with faint fibres. Tileable-ish. */
export function makePaperTexture(): { map: Texture; bump: Texture } {
  const size = 1024
  const [c, ctx] = canvas(size, size)
  ctx.fillStyle = '#f2e9d4'
  ctx.fillRect(0, 0, size, size)
  const rnd = mulberry32(7)
  const img = ctx.getImageData(0, 0, size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 14
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n * 1.1
  }
  ctx.putImageData(img, 0, 0)
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 1400; i++) {
    ctx.strokeStyle = rnd() > 0.5 ? '#8a7650' : '#fff8e4'
    ctx.lineWidth = 0.6 + rnd() * 0.8
    const x = rnd() * size
    const y = rnd() * size
    const a = rnd() * Math.PI
    const l = 6 + rnd() * 26
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l)
    ctx.stroke()
  }
  const map = new CanvasTexture(c)
  map.colorSpace = SRGBColorSpace
  map.wrapS = map.wrapT = RepeatWrapping
  map.anisotropy = 8

  const [bc, bctx] = canvas(256, 256)
  const bimg = bctx.createImageData(256, 256)
  const r2 = mulberry32(11)
  for (let i = 0; i < bimg.data.length; i += 4) {
    const v = 128 + (r2() - 0.5) * 70
    bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = v
    bimg.data[i + 3] = 255
  }
  bctx.putImageData(bimg, 0, 0)
  const bump = new CanvasTexture(bc)
  bump.colorSpace = NoColorSpace
  bump.wrapS = bump.wrapT = RepeatWrapping
  bump.repeat.set(6, 8)
  return { map, bump }
}

export function makeWoodTexture(): Texture {
  const [c, ctx] = canvas(1024, 1024)
  const rnd = mulberry32(3)
  ctx.fillStyle = '#3a2618'
  ctx.fillRect(0, 0, 1024, 1024)
  for (let y = 0; y < 1024; y += 2) {
    const tone = 40 + rnd() * 26
    ctx.fillStyle = `rgba(${tone + 28},${tone + 4},${tone - 14},0.55)`
    ctx.fillRect(0, y, 1024, 2)
  }
  ctx.globalAlpha = 0.18
  for (let i = 0; i < 240; i++) {
    ctx.strokeStyle = rnd() > 0.5 ? '#1c1109' : '#6a4a2e'
    ctx.lineWidth = 0.5 + rnd() * 1.6
    const y = rnd() * 1024
    ctx.beginPath()
    ctx.moveTo(0, y)
    for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, y + Math.sin(x * 0.01 + i) * (2 + rnd() * 6))
    ctx.stroke()
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(3, 2)
  t.anisotropy = 8
  return t
}

/** A key top: cream disc with a dark ring and the two characters (shift above, base below). */
export function makeKeyTexture(base: string, shift: string): Texture {
  const s = 128
  const [c, ctx] = canvas(s, s)
  ctx.fillStyle = '#e9e0c9'
  ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = '#17130f'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, s / 2 - 8, 0, Math.PI * 2)
  ctx.stroke()
  ctx.fillStyle = '#17130f'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const letter = /[a-z]/i.test(base)
  if (letter) {
    ctx.font = '700 64px "Courier Prime", "Courier New", monospace'
    ctx.fillText(shift, s / 2, s / 2 + 3)
  } else {
    ctx.font = '700 44px "Courier Prime", "Courier New", monospace'
    ctx.fillText(shift, s / 2, s * 0.34)
    ctx.fillText(base, s / 2, s * 0.68)
  }
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 4
  return t
}

/** A glyph atlas: one cell is exactly one typewriter cell (1/10 in by 1/6 in). */
export const ATLAS_CELL_PX = { w: 80, h: Math.round((80 * CELL_H) / CELL_W) }
export const ATLAS_COLS = 25
export const ATLAS_ROWS = 15

export interface GlyphAtlas {
  readonly texture: CanvasTexture
  /** Atlas cell (col, row) for a character, drawing it on first use. Falls back to '?'. */
  cellFor(char: string): readonly [number, number]
  readonly capacity: number
}

export function createGlyphAtlas(): GlyphAtlas {
  const { w, h } = ATLAS_CELL_PX
  const [c, ctx] = canvas(ATLAS_COLS * w, ATLAS_ROWS * h)
  const texture = new CanvasTexture(c)
  texture.colorSpace = NoColorSpace
  texture.generateMipmaps = true
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.anisotropy = 8
  const cells = new Map<string, readonly [number, number]>()
  let next = 0
  const fontPx = w / 0.6
  const capacity = ATLAS_COLS * ATLAS_ROWS

  const draw = (char: string): readonly [number, number] => {
    const i = next++
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    ctx.font = `400 ${fontPx}px "Courier Prime", "Courier New", monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    const m = ctx.measureText(char)
    const asc = m.fontBoundingBoxAscent ?? fontPx * 0.8
    const desc = m.fontBoundingBoxDescent ?? fontPx * 0.25
    const baseline = row * h + (h - (asc + desc)) / 2 + asc
    ctx.fillStyle = '#fff'
    ctx.fillText(char, col * w + w / 2, baseline)
    texture.needsUpdate = true
    const cell = [col, row] as const
    cells.set(char, cell)
    return cell
  }

  return {
    texture,
    capacity,
    cellFor(char) {
      const hit = cells.get(char)
      if (hit) return hit
      if (next >= capacity) return cells.get('?') ?? draw('?')
      return draw(char)
    },
  }
}
