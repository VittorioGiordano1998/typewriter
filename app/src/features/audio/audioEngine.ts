/**
 * Plays the typewriter's sounds with the Web Audio API. Samples are fetched and decoded once;
 * the context itself is created on the first sound, which happens inside a keystroke, so the
 * browser's autoplay rules are satisfied.
 */
import type { TypewriterEvent } from '../../core/carriage'
import type { Session } from '../session/session'
import { SAMPLE_NAMES, SoundPlanner, type SampleName, type SoundPlan } from './soundPlan'

export interface AudioSettings {
  /** 0..1 */
  readonly volume: number
  readonly muted: boolean
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private readonly buffers = new Map<SampleName, AudioBuffer>()
  private readonly planner = new SoundPlanner()
  private loading: Promise<void> | null = null
  private volume = 0.8
  private muted = false
  private readonly baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /** Fetches and decodes every sample. Safe to call early: it needs no user gesture. */
  load(): Promise<void> {
    this.loading ??= this.loadAll()
    return this.loading
  }

  private async loadAll(): Promise<void> {
    // An offline context decodes without waking audio hardware or needing a gesture; the buffers
    // play in any context afterwards.
    const Offline = window.OfflineAudioContext
    if (typeof Offline !== 'function') return
    const decoder = new Offline(1, 1, 44100)
    await Promise.all(
      SAMPLE_NAMES.map(async (name) => {
        try {
          const res = await fetch(`${this.baseUrl}audio/${name}.mp3`)
          if (!res.ok) return
          const data = await res.arrayBuffer()
          this.buffers.set(name, await decoder.decodeAudioData(data))
        } catch {
          // A missing sample is silent rather than fatal.
        }
      }),
    )
  }

  configure(settings: AudioSettings): void {
    this.volume = settings.volume
    this.muted = settings.muted
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume
  }

  /** Subscribes to a session's events; returns the unsubscribe function. */
  attach(session: Session): () => void {
    return session.onEvent((e) => this.handle(e, session.getState().cursor.col))
  }

  private handle(event: TypewriterEvent, col: number): void {
    if (this.muted || this.volume <= 0) return
    const ctx = this.ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    for (const plan of this.planner.plan(event, col)) this.play(ctx, plan)
  }

  private ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    const ctx = new Ctor({ latencyHint: 'interactive' })
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : this.volume
    // Fast typing stacks many sounds: a gentle compressor keeps the peaks from clipping.
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -14
    compressor.ratio.value = 4
    master.connect(compressor).connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    return ctx
  }

  private play(ctx: AudioContext, plan: SoundPlan): void {
    if (!this.master) return
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null
    if (pan) pan.pan.value = plan.pan
    const out = pan ?? this.master
    if (pan) pan.connect(this.master)
    const now = ctx.currentTime

    if (plan.kind === 'sample') {
      const buffer = this.buffers.get(plan.sample)
      if (!buffer) return
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.playbackRate.value = plan.rate
      const gain = ctx.createGain()
      gain.gain.value = plan.gain
      let node: AudioNode = src
      if (plan.lowpass) {
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = plan.lowpass
        node.connect(lp)
        node = lp
      }
      node.connect(gain).connect(out)
      src.start(now)
      if (plan.stopAfter !== undefined) {
        const end = now + plan.stopAfter
        gain.gain.setValueAtTime(plan.gain, Math.max(now, end - 0.06))
        gain.gain.linearRampToValueAtTime(0, end)
        src.stop(end + 0.01)
      }
      return
    }

    if (plan.voice === 'thunk') this.thunk(ctx, out, plan.gain, now)
    else this.paper(ctx, out, plan.gain, now)
  }

  /** The dull knock of the carriage hitting its stop. */
  private thunk(ctx: AudioContext, out: AudioNode, gain: number, now: number): void {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(130, now)
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.11)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.14)
    osc.connect(g).connect(out)
    osc.start(now)
    osc.stop(now + 0.16)
    const click = this.noiseSource(ctx)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    const cg = ctx.createGain()
    cg.gain.setValueAtTime(gain * 0.5, now)
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
    click.connect(lp).connect(cg).connect(out)
    click.start(now)
    click.stop(now + 0.06)
  }

  /** A sheet sliding through the rollers: band-passed noise that sweeps upward. */
  private paper(ctx: AudioContext, out: AudioNode, gain: number, now: number): void {
    const src = this.noiseSource(ctx)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.9
    bp.frequency.setValueAtTime(700, now)
    bp.frequency.exponentialRampToValueAtTime(3200, now + 0.5)
    bp.frequency.exponentialRampToValueAtTime(900, now + 1.0)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, now)
    g.gain.linearRampToValueAtTime(gain * 0.55, now + 0.12)
    g.gain.linearRampToValueAtTime(gain * 0.35, now + 0.55)
    g.gain.linearRampToValueAtTime(gain * 0.5, now + 0.62)
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.05)
    src.connect(bp).connect(g).connect(out)
    src.start(now)
    src.stop(now + 1.1)
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    if (!this.noise) {
      const len = ctx.sampleRate
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      this.noise = buf
    }
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    return src
  }
}
