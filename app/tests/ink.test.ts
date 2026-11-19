import { describe, expect, it } from 'vitest'
import { hashInts, INK_BOUNDS, inkFor, mulberry32 } from '../src/core/ink'

describe('ink', () => {
  it('is deterministic for the same seed and character', () => {
    expect(inkFor('a', 12345)).toEqual(inkFor('a', 12345))
  })

  it('differs between seeds', () => {
    expect(inkFor('a', 1)).not.toEqual(inkFor('a', 2))
  })

  it('stays within its configured bounds over 10 000 random seeds', () => {
    const rnd = mulberry32(99)
    const chars = [...'abcXYZ09.,@M-']
    for (let i = 0; i < 10_000; i++) {
      const ink = inkFor(chars[i % chars.length], Math.floor(rnd() * 0xffffffff))
      expect(Math.abs(ink.dx)).toBeLessThanOrEqual(INK_BOUNDS.dx)
      expect(Math.abs(ink.dy)).toBeLessThanOrEqual(INK_BOUNDS.dy)
      expect(Math.abs(ink.rot)).toBeLessThanOrEqual(INK_BOUNDS.rot)
      expect(ink.density).toBeGreaterThanOrEqual(INK_BOUNDS.densityMin)
      expect(ink.density).toBeLessThanOrEqual(INK_BOUNDS.densityMax)
    }
  })

  it('gives a character a stable bias across strikes (a bent typebar)', () => {
    // Averaged over many strikes the jitter cancels out and the per-glyph bias remains.
    const mean = (ch: string) => {
      let sum = 0
      const n = 4000
      for (let i = 0; i < n; i++) sum += inkFor(ch, hashInts(1, i)).dy
      return sum / n
    }
    expect(mean('a')).toBeCloseTo(mean('a'), 10)
    expect(Math.abs(mean('a') - mean('k'))).toBeGreaterThan(0.002)
  })
})
