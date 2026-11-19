import { describe, expect, it } from 'vitest'
import { minViewWidth } from '../src/scene/framing'

describe('minViewWidth', () => {
  it('shows a generous width on wide screens and a tight one on upright phones', () => {
    expect(minViewWidth(16 / 9)).toBe(23)
    expect(minViewWidth(390 / 844)).toBe(9)
  })

  it('grows with the aspect ratio and never leaves its range', () => {
    let last = 0
    for (let a = 0.2; a < 3; a += 0.05) {
      const w = minViewWidth(a)
      expect(w).toBeGreaterThanOrEqual(last)
      expect(w).toBeGreaterThanOrEqual(9)
      expect(w).toBeLessThanOrEqual(23)
      last = w
    }
  })
})
