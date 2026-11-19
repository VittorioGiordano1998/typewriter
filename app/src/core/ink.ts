/**
 * Seeded ink imperfection. The 3D scene and the 2D export both call `inkFor`, so a PNG or PDF
 * matches the screen exactly.
 */
import type { Ribbon } from './page'

/** A small, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mixes integers into one 32-bit hash. */
export function hashInts(...values: number[]): number {
  let h = 0x811c9dc5
  for (const v of values) {
    h ^= v | 0
    h = Math.imul(h, 0x01000193)
    h ^= h >>> 15
  }
  return h >>> 0
}

export function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Largest offsets the ink can show, in cell fractions and radians. */
export const INK_BOUNDS = {
  /** Horizontal offset, fraction of one cell width. */
  dx: 0.09,
  /** Vertical offset, fraction of one cell width (typebars strike slightly high or low). */
  dy: 0.12,
  /** Rotation, radians. */
  rot: 0.045,
  densityMin: 0.62,
  densityMax: 1,
} as const

export interface InkParams {
  readonly dx: number
  readonly dy: number
  readonly rot: number
  /** 0..1: how dark the impression is. */
  readonly density: number
  /** Scale of the glyph, 1 = nominal. A worn typebar prints a hair wider. */
  readonly scale: number
}

const BAR_BIAS = { dx: 0.03, dy: 0.05, rot: 0.015, density: 0.07 }
const JITTER = { dx: 0.05, dy: 0.06, rot: 0.028, density: 0.3 }
const HEAVY = 'MWmw@#%&B8'
const LIGHT = ".,'`:;-_\""

/** Heavier glyphs print darker. */
function weightOf(char: string): number {
  if (HEAVY.includes(char)) return 1
  if (LIGHT.includes(char)) return 0.82
  return 0.93
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

/**
 * Ink parameters for one strike. The per-glyph part (a "bent typebar") depends on the character
 * only and is stable across strikes; the jitter depends on the strike seed.
 */
export function inkFor(char: string, seed: number): InkParams {
  const bar = mulberry32(hashString(char))
  const rnd = mulberry32(seed)
  const centred = (r: () => number) => r() * 2 - 1
  const dx = centred(bar) * BAR_BIAS.dx + centred(rnd) * JITTER.dx
  const dy = centred(bar) * BAR_BIAS.dy + centred(rnd) * JITTER.dy
  const rot = centred(bar) * BAR_BIAS.rot + centred(rnd) * JITTER.rot
  const barDensity = 1 - bar() * BAR_BIAS.density
  const densityJitter = 1 - rnd() * JITTER.density
  const density = clamp(barDensity * densityJitter * weightOf(char), INK_BOUNDS.densityMin, INK_BOUNDS.densityMax)
  return {
    dx: clamp(dx, -INK_BOUNDS.dx, INK_BOUNDS.dx),
    dy: clamp(dy, -INK_BOUNDS.dy, INK_BOUNDS.dy),
    rot: clamp(rot, -INK_BOUNDS.rot, INK_BOUNDS.rot),
    density,
    scale: 1 + (rnd() - 0.5) * 0.03,
  }
}

/** Ink colours per ribbon, as sRGB hex. */
export const RIBBON_COLOR: Record<Ribbon, string> = {
  black: '#1b1815',
  red: '#a3201c',
}
