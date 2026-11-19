import { describe, expect, it } from 'vitest'
import { initialQuality, QUALITY, stepQuality, type DeviceHints } from '../src/scene/quality'

const hints = (over: Partial<DeviceHints> = {}): DeviceHints => ({
  coarsePointer: false,
  cores: 8,
  memoryGb: 8,
  screenWidth: 1920,
  ...over,
})

describe('initialQuality', () => {
  it('starts a capable desktop at high', () => {
    expect(initialQuality(hints())).toBe('high')
  })

  it('starts an unknown desktop (no hints) at high', () => {
    expect(initialQuality(hints({ cores: 0, memoryGb: 0 }))).toBe('high')
  })

  it('starts a weak desktop at medium', () => {
    expect(initialQuality(hints({ cores: 2 }))).toBe('medium')
    expect(initialQuality(hints({ memoryGb: 2 }))).toBe('medium')
  })

  it('starts a good phone or tablet at medium and a weak or small phone at low', () => {
    expect(initialQuality(hints({ coarsePointer: true, screenWidth: 820 }))).toBe('medium')
    expect(initialQuality(hints({ coarsePointer: true, cores: 4, screenWidth: 820 }))).toBe('low')
    expect(initialQuality(hints({ coarsePointer: true, screenWidth: 390 }))).toBe('low')
  })
})

describe('stepQuality', () => {
  it('steps down and up one tier at a time, and stops at the ends', () => {
    expect(stepQuality('high', 'down')).toBe('medium')
    expect(stepQuality('medium', 'down')).toBe('low')
    expect(stepQuality('low', 'down')).toBe('low')
    expect(stepQuality('low', 'up')).toBe('medium')
    expect(stepQuality('medium', 'up')).toBe('high')
    expect(stepQuality('high', 'up')).toBe('high')
  })
})

describe('QUALITY profiles', () => {
  it('get cheaper from high to low', () => {
    expect(QUALITY.high.shadowMap).toBeGreaterThan(QUALITY.medium.shadowMap)
    expect(QUALITY.medium.shadowMap).toBeGreaterThan(QUALITY.low.shadowMap)
    expect(QUALITY.high.dpr[1]).toBeGreaterThan(QUALITY.medium.dpr[1])
    expect(QUALITY.medium.dpr[1]).toBeGreaterThan(QUALITY.low.dpr[1])
  })
})
