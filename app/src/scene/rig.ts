/**
 * Mutable animation state of the machine, advanced once per frame. The session's events trigger
 * animations; the cursor drives the carriage and platen. Scene components only read this in
 * `useFrame`, so no keystroke re-renders React.
 */
import type { TypewriterEvent } from '../core/carriage'
import type { Session } from '../features/session/session'
import { PAGE_FEED_MS, returnDurationMs } from '../features/session/timing'
import { CELL_H, CELL_W, PLATEN_R } from './constants'
import { BACKSPACE_KEY, BAR_OF_KEY, KEY_COUNT, keyFor, RETURN_KEY, SHIFT_KEY, SPACE_INDEX } from './keyboardLayout'
import layout from './modelLayout.json'

const NEVER = 99

/** Seconds. A typebar flies up, kisses the platen, and falls back. */
export const BAR_UP = 0.045
export const BAR_HOLD = 0.02
export const BAR_DOWN = 0.12
export const KEY_DOWN = 0.04
export const KEY_HOLD = 0.04
export const KEY_UP = 0.1

export type FeedPhase = 'idle' | 'out' | 'in'

export class MachineRig {
  /** Seconds since each key was pressed; index SPACE_INDEX is the space bar. */
  readonly sinceStrike = new Float32Array(KEY_COUNT + 1).fill(NEVER)
  /** Seconds since each typebar flew to the platen. */
  readonly sinceBar = new Float32Array(layout.bars.length).fill(NEVER)
  /** Carriage offset in cm (0 at column 0, negative as the carriage advances). */
  carriageX = 0
  /** Platen position in lines, eased toward the cursor row. */
  rowAnim = 0
  /** Seconds since the carriage-return lever was pushed. */
  sinceReturn = NEVER
  returnSeconds = 0.5
  /** Seconds since the last strike, for the ribbon vibrator. */
  sinceRibbon = NEVER
  sinceBell = NEVER
  sinceLock = NEVER
  /** Page whose glyphs are drawn: lags behind the cursor while a sheet ejects. */
  displayPage = 0
  feedPhase: FeedPhase = 'idle'
  feedT = 0
  /** Extra height of the sheet while it is ejected or fed, in cm. */
  feedOffset = 0
  returning = false
  private reducedMotion = false
  private carriageRate = 55

  private readonly session: Session

  constructor(session: Session) {
    this.session = session
    this.displayPage = session.getState().cursor.page
    this.carriageX = -session.getState().cursor.col * CELL_W
    this.rowAnim = session.getState().cursor.row
  }

  /** With reduced motion, a full sheet swaps instantly instead of flying out and a new one in. */
  setReducedMotion(value: boolean): void {
    this.reducedMotion = value
  }

  /** Subscribes to the session's events; returns the unsubscribe function. */
  attach(): () => void {
    const offEvents = this.session.onEvent((e) => this.onEvent(e))
    const offReset = this.session.onReset(() => this.snap())
    return () => {
      offEvents()
      offReset()
    }
  }

  /** Snaps everything to the current state (a sheet was opened). */
  snap(): void {
    const { cursor } = this.session.getState()
    this.displayPage = cursor.page
    this.carriageX = -cursor.col * CELL_W
    this.rowAnim = cursor.row
    this.feedPhase = 'idle'
    this.feedOffset = 0
    this.returning = false
  }

  private onEvent(e: TypewriterEvent): void {
    switch (e.type) {
      case 'strike': {
        const { key, shifted } = keyFor(e.strike.char)
        this.sinceStrike[key] = 0
        if (shifted && SHIFT_KEY >= 0) this.sinceStrike[SHIFT_KEY] = 0
        const bar = BAR_OF_KEY[key]
        if (bar >= 0) this.sinceBar[bar] = 0
        this.sinceRibbon = 0
        break
      }
      case 'space':
        this.sinceStrike[SPACE_INDEX] = 0
        break
      case 'backspace':
        if (BACKSPACE_KEY >= 0) this.sinceStrike[BACKSPACE_KEY] = 0
        break
      case 'return':
        if (RETURN_KEY >= 0) this.sinceStrike[RETURN_KEY] = 0
        this.sinceReturn = 0
        this.returnSeconds = returnDurationMs(e.from) / 1000
        this.returning = true
        this.carriageRate = 5.2 / this.returnSeconds
        break
      case 'bell':
        this.sinceBell = 0
        break
      case 'lock':
        this.sinceLock = 0
        break
      case 'pageFull':
        if (this.reducedMotion) {
          this.snap()
        } else {
          this.feedPhase = 'out'
          this.feedT = 0
        }
        break
      default:
        break
    }
  }

  update(dt: number): void {
    const step = Math.min(dt, 0.05)
    for (let i = 0; i < this.sinceStrike.length; i++) {
      if (this.sinceStrike[i] < NEVER) this.sinceStrike[i] += step
    }
    for (let i = 0; i < this.sinceBar.length; i++) {
      if (this.sinceBar[i] < NEVER) this.sinceBar[i] += step
    }
    this.sinceReturn += step
    this.sinceRibbon += step
    this.sinceBell += step
    this.sinceLock += step

    const { cursor } = this.session.getState()
    const targetX = -cursor.col * CELL_W
    if (this.returning && Math.abs(this.carriageX - targetX) < 0.02) {
      this.returning = false
      this.carriageRate = 55
    }
    if (!this.returning) this.carriageRate = 55
    this.carriageX += (targetX - this.carriageX) * (1 - Math.exp(-step * this.carriageRate))

    // The platen turns on a line feed; a fresh sheet starts at the top.
    if (this.feedPhase === 'idle') {
      this.rowAnim += (cursor.row - this.rowAnim) * (1 - Math.exp(-step * 20))
    }
    this.updateFeed(step, cursor.page, cursor.row)
  }

  private updateFeed(step: number, cursorPage: number, cursorRow: number): void {
    const half = PAGE_FEED_MS / 2000
    if (this.feedPhase === 'idle') {
      this.feedOffset = 0
      if (this.displayPage !== cursorPage) this.displayPage = cursorPage
      return
    }
    this.feedT += step
    if (this.feedPhase === 'out') {
      const k = Math.min(1, this.feedT / half)
      this.feedOffset = 46 * k * k * k
      if (k >= 1) {
        this.displayPage = cursorPage
        this.rowAnim = cursorRow
        this.feedPhase = 'in'
        this.feedT = 0
      }
    } else {
      const k = Math.min(1, this.feedT / half)
      this.feedOffset = -40 * (1 - easeOut(k))
      if (k >= 1) {
        this.feedPhase = 'idle'
        this.feedOffset = 0
      }
    }
  }
}

export function easeOut(t: number): number {
  const u = 1 - Math.min(1, Math.max(0, t))
  return 1 - u * u * u
}

export function easeInOut(t: number): number {
  const u = Math.min(1, Math.max(0, t))
  return u * u * (3 - 2 * u)
}

/** Fraction of the typebar's travel at `t` seconds after the strike: 0 at rest, 1 at the platen. */
export function barTravel(t: number): number {
  if (t < BAR_UP) return easeOut(t / BAR_UP)
  if (t < BAR_UP + BAR_HOLD) return 1
  const k = (t - BAR_UP - BAR_HOLD) / BAR_DOWN
  return k >= 1 ? 0 : 1 - easeInOut(k)
}

/** Fraction of the key's depression. */
export function keyTravel(t: number): number {
  if (t < KEY_DOWN) return easeOut(t / KEY_DOWN)
  if (t < KEY_DOWN + KEY_HOLD) return 1
  const k = (t - KEY_DOWN - KEY_HOLD) / KEY_UP
  return k >= 1 ? 0 : 1 - easeInOut(k)
}

/** Platen radians per line. */
export const PLATEN_PER_LINE = CELL_H / PLATEN_R
