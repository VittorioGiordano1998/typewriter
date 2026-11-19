/**
 * Decides which sound a typewriter event makes. Pure: the Web Audio engine plays the plan, tests
 * check it. Natural variation (pitch, volume, which take) comes from the injected random source.
 */
import type { TypewriterEvent } from '../../core/carriage'
import { RIGHT_MARGIN } from '../../core/page'
import { returnDurationMs } from '../session/timing'

export const KEY_SAMPLES = ['key-1', 'key-2', 'key-3', 'key-4', 'key-5', 'key-6'] as const
export const SAMPLE_NAMES = [...KEY_SAMPLES, 'bell', 'return', 'linefeed'] as const
export type SampleName = (typeof SAMPLE_NAMES)[number]

export type SoundPlan =
  | {
      readonly kind: 'sample'
      readonly sample: SampleName
      /** Playback rate; 1 = as recorded. */
      readonly rate: number
      readonly gain: number
      /** -1 (left) .. 1 (right). */
      readonly pan: number
      /** Low-pass cutoff in Hz, to dull a sound. */
      readonly lowpass?: number
      /** Cut the sound after this many seconds, with a short fade. */
      readonly stopAfter?: number
    }
  | { readonly kind: 'synth'; readonly voice: 'thunk' | 'paper'; readonly gain: number; readonly pan: number }

/** The carriage's column spreads the sound slightly across the stereo field. */
export function panFor(col: number): number {
  return Math.max(-1, Math.min(1, (col / RIGHT_MARGIN - 0.5) * 0.7))
}

export class SoundPlanner {
  private lastKey = -1
  private readonly rnd: () => number

  constructor(rnd: () => number = Math.random) {
    this.rnd = rnd
  }

  /** The plans for one event, given the carriage column after it. */
  plan(event: TypewriterEvent, col: number): SoundPlan[] {
    const pan = panFor(col)
    switch (event.type) {
      case 'strike':
        return [{ kind: 'sample', sample: this.nextKey(), rate: this.vary(0.04), gain: 0.78 + this.rnd() * 0.22, pan: panFor(event.strike.col) }]
      case 'space':
        // The space bar is a duller, deeper thud than a typebar.
        return [{ kind: 'sample', sample: this.nextKey(), rate: 0.7 * this.vary(0.03), gain: 0.62, pan, lowpass: 1900 }]
      case 'backspace':
        return [{ kind: 'sample', sample: this.nextKey(), rate: 0.88 * this.vary(0.03), gain: 0.42, pan, lowpass: 3200 }]
      case 'tab':
      case 'skip':
        return [{ kind: 'sample', sample: 'linefeed', rate: 1.25, gain: 0.7, pan }]
      case 'bell':
        return [{ kind: 'sample', sample: 'bell', rate: this.vary(0.01), gain: 0.85, pan: 0.15 }]
      case 'return':
        // The recording is the whole ratchet; cut it where the carriage stops.
        return [{ kind: 'sample', sample: 'return', rate: 1, gain: 0.9, pan: 0, stopAfter: returnDurationMs(event.from) / 1000 + 0.05 }]
      case 'lock':
        return [{ kind: 'synth', voice: 'thunk', gain: 0.55, pan }]
      case 'pageFull':
        return [{ kind: 'synth', voice: 'paper', gain: 0.5, pan: 0 }]
      case 'ribbon':
        return [{ kind: 'sample', sample: 'linefeed', rate: 1.6, gain: 0.35, pan: 0, stopAfter: 0.12 }]
      case 'lineFeed':
        // Already part of the return recording.
        return []
    }
  }

  private nextKey(): SampleName {
    const n = KEY_SAMPLES.length
    const i = this.lastKey < 0 ? Math.floor(this.rnd() * n) : (this.lastKey + 1 + Math.floor(this.rnd() * (n - 1))) % n
    this.lastKey = i
    return KEY_SAMPLES[i]
  }

  private vary(amount: number): number {
    return 1 + (this.rnd() * 2 - 1) * amount
  }
}
