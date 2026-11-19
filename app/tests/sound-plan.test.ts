import { describe, expect, it } from 'vitest'
import type { TypewriterEvent } from '../src/core/carriage'
import { mulberry32 } from '../src/core/ink'
import { RIGHT_MARGIN, type Strike } from '../src/core/page'
import { KEY_SAMPLES, panFor, SoundPlanner, type SoundPlan } from '../src/features/audio/soundPlan'
import { returnDurationMs } from '../src/features/session/timing'

const strike = (col: number, char = 'a'): TypewriterEvent => ({
  type: 'strike',
  page: 0,
  strike: { col, row: 0, char, ribbon: 'black', seed: 1 } satisfies Strike,
})

function one(planner: SoundPlanner, event: TypewriterEvent, col = 10): SoundPlan {
  const plans = planner.plan(event, col)
  expect(plans).toHaveLength(1)
  return plans[0]
}

function sample(plan: SoundPlan) {
  if (plan.kind !== 'sample') throw new Error('expected a sample plan')
  return plan
}

describe('SoundPlanner', () => {
  it('plays one of the key takes for a strike, with bounded pitch and volume variation', () => {
    const planner = new SoundPlanner(mulberry32(1))
    for (let i = 0; i < 200; i++) {
      const p = sample(one(planner, strike(i % RIGHT_MARGIN)))
      expect(KEY_SAMPLES as readonly string[]).toContain(p.sample)
      expect(p.rate).toBeGreaterThanOrEqual(0.96)
      expect(p.rate).toBeLessThanOrEqual(1.04)
      expect(p.gain).toBeGreaterThanOrEqual(0.78)
      expect(p.gain).toBeLessThanOrEqual(1)
    }
  })

  it('never plays the same key take twice in a row', () => {
    const planner = new SoundPlanner(mulberry32(5))
    let last = ''
    for (let i = 0; i < 500; i++) {
      const p = sample(one(planner, strike(0)))
      expect(p.sample).not.toBe(last)
      last = p.sample
    }
  })

  it('makes the space bar duller and deeper than a typebar', () => {
    const p = sample(one(new SoundPlanner(mulberry32(2)), { type: 'space' }))
    expect(p.rate).toBeLessThan(0.8)
    expect(p.lowpass).toBeDefined()
  })

  it('rings the bell sample', () => {
    expect(sample(one(new SoundPlanner(), { type: 'bell' })).sample).toBe('bell')
  })

  it('cuts the carriage-return recording where the carriage stops', () => {
    const planner = new SoundPlanner()
    const short = sample(one(planner, { type: 'return', from: 5 }))
    const long = sample(one(planner, { type: 'return', from: 60 }))
    expect(short.sample).toBe('return')
    expect(short.stopAfter).toBeCloseTo(returnDurationMs(5) / 1000 + 0.05)
    expect(long.stopAfter ?? 0).toBeGreaterThan(short.stopAfter ?? 0)
  })

  it('has synthesised voices for the margin lock and a full sheet', () => {
    const planner = new SoundPlanner()
    expect(one(planner, { type: 'lock' })).toMatchObject({ kind: 'synth', voice: 'thunk' })
    expect(one(planner, { type: 'pageFull', page: 0 })).toMatchObject({ kind: 'synth', voice: 'paper' })
  })

  it('does not add a separate sound for the line feed: it is part of the return recording', () => {
    expect(new SoundPlanner().plan({ type: 'lineFeed' }, 0)).toEqual([])
  })

  it('is deterministic for a given random source', () => {
    const run = () => {
      const p = new SoundPlanner(mulberry32(9))
      return Array.from({ length: 20 }, () => one(p, strike(3)))
    }
    expect(run()).toEqual(run())
  })
})

describe('panFor', () => {
  it('spreads from left to right across the line and stays in range', () => {
    expect(panFor(0)).toBeLessThan(0)
    expect(panFor(RIGHT_MARGIN)).toBeGreaterThan(0)
    for (let c = -10; c < RIGHT_MARGIN + 10; c++) {
      expect(Math.abs(panFor(c))).toBeLessThanOrEqual(1)
    }
  })
})
