/**
 * The typewriter state machine: carriage position, margins, bell, margin lock, overstrike and
 * paper feed. A pure reducer, so it is trivially testable and the views only ever see events.
 */
import { hashInts } from './ink'
import {
  BELL_COL,
  PAGE_ROWS,
  RIGHT_MARGIN,
  TAB_WIDTH,
  type Page,
  type Ribbon,
  type Strike,
  type TypewriterDocument,
} from './page'

export interface Cursor {
  readonly page: number
  readonly row: number
  readonly col: number
}

export interface TypewriterState {
  readonly doc: TypewriterDocument
  readonly cursor: Cursor
  readonly ribbon: Ribbon
  /**
   * After a cross-out the carriage sits on the last character it crossed out; this is the column
   * where the line ended, so the next keystroke continues there. Null when not crossing out.
   */
  readonly resumeCol: number | null
}

/** The character struck over a crossed-out cell. */
export const CROSS_OUT_CHAR = 'X'

export type Action =
  | { readonly type: 'char'; readonly char: string }
  | { readonly type: 'space' }
  | { readonly type: 'backspace' }
  /** Backspace in cross-out mode: strike an X over the previous character. */
  | { readonly type: 'crossOut' }
  | { readonly type: 'tab' }
  | { readonly type: 'return' }
  | { readonly type: 'ribbon'; readonly ribbon: Ribbon }

/** What happened, for the scene and the sound engine. Reducing never touches either. */
export type TypewriterEvent =
  | { readonly type: 'strike'; readonly strike: Strike; readonly page: number }
  | { readonly type: 'space' }
  | { readonly type: 'backspace' }
  | { readonly type: 'tab'; readonly from: number; readonly to: number }
  /** The carriage slides back to where the line ended, after a cross-out. */
  | { readonly type: 'skip'; readonly from: number; readonly to: number }
  | { readonly type: 'bell' }
  | { readonly type: 'lock' }
  | { readonly type: 'return'; readonly from: number }
  | { readonly type: 'lineFeed' }
  | { readonly type: 'pageFull'; readonly page: number }
  | { readonly type: 'ribbon'; readonly ribbon: Ribbon }

export interface Result {
  readonly state: TypewriterState
  readonly events: readonly TypewriterEvent[]
}

export function createState(doc: TypewriterDocument, cursor?: Cursor, ribbon: Ribbon = 'black'): TypewriterState {
  return { doc, cursor: cursor ?? { page: doc.pages.length - 1, row: 0, col: 0 }, ribbon, resumeCol: null }
}

/** The carriage cannot move right any further. */
export function isLocked(col: number): boolean {
  return col >= RIGHT_MARGIN
}

export function reduce(state: TypewriterState, action: Action, now: number = state.doc.updatedAt): Result {
  switch (action.type) {
    case 'char':
      return afterResume(state, (s) => typeChar(s, action.char, now))
    case 'space':
      return afterResume(state, (s) => advance(s, 1, { type: 'space' }))
    case 'backspace': {
      const cleared: TypewriterState = state.resumeCol === null ? state : { ...state, resumeCol: null }
      return state.cursor.col > 0
        ? { state: withCursor(cleared, { col: state.cursor.col - 1 }), events: [{ type: 'backspace' }] }
        : { state: cleared, events: [] }
    }
    case 'crossOut':
      return crossOut(state, now)
    case 'tab':
      return afterResume(state, (s) => {
        const from = s.cursor.col
        if (isLocked(from)) return { state: s, events: [{ type: 'lock' }] }
        const to = Math.min(RIGHT_MARGIN, (Math.floor(from / TAB_WIDTH) + 1) * TAB_WIDTH)
        return advance(s, to - from, { type: 'tab', from, to })
      })
    case 'return':
      return carriageReturn(state.resumeCol === null ? state : { ...state, resumeCol: null })
    case 'ribbon':
      return state.ribbon === action.ribbon
        ? { state, events: [] }
        : { state: { ...state, ribbon: action.ribbon }, events: [{ type: 'ribbon', ribbon: action.ribbon }] }
  }
}

function withCursor(state: TypewriterState, patch: Partial<Cursor>): TypewriterState {
  return { ...state, cursor: { ...state.cursor, ...patch } }
}

/** Adds a strike at the carriage position; the carriage advances one column unless told not to. */
function strikeHere(state: TypewriterState, char: string, now: number, advanceCarriage: boolean): Result {
  const { cursor, doc } = state
  const strike: Strike = {
    col: cursor.col,
    row: cursor.row,
    char,
    ribbon: state.ribbon,
    seed: hashInts(doc.seed, doc.strikeCount),
  }
  const pages = doc.pages.map((p, i): Page => (i === cursor.page ? { strikes: [...p.strikes, strike] } : p))
  const next: TypewriterState = {
    ...state,
    doc: { ...doc, pages, strikeCount: doc.strikeCount + 1, updatedAt: now },
    cursor: { ...cursor, col: advanceCarriage ? cursor.col + 1 : cursor.col },
  }
  const events: TypewriterEvent[] = [{ type: 'strike', strike, page: cursor.page }]
  if (advanceCarriage && cursor.col + 1 === BELL_COL) events.push({ type: 'bell' })
  return { state: next, events }
}

function typeChar(state: TypewriterState, char: string, now: number): Result {
  if (char === ' ') return advance(state, 1, { type: 'space' })
  if (char.length === 0) return { state, events: [] }
  if (isLocked(state.cursor.col)) return { state, events: [{ type: 'lock' }] }
  return strikeHere(state, char, now, true)
}

/**
 * Backspace the way a typist corrects a mistake: back one column and an X over that character.
 * The carriage stays on the X, so pressing again crosses out the one before; the end of the line
 * is remembered, and the next keystroke slides the carriage back there first.
 */
function crossOut(state: TypewriterState, now: number): Result {
  const { col } = state.cursor
  if (col === 0) return { state, events: [] }
  const resumeCol = state.resumeCol ?? col
  const back = withCursor({ ...state, resumeCol }, { col: col - 1 })
  const struck = strikeHere(back, CROSS_OUT_CHAR, now, false)
  return { state: struck.state, events: [{ type: 'backspace' }, ...struck.events] }
}

/** Runs `then` after sliding the carriage back to the end of the line, if a cross-out left it short. */
function afterResume(state: TypewriterState, then: (s: TypewriterState) => Result): Result {
  if (state.resumeCol === null) return then(state)
  const from = state.cursor.col
  const to = state.resumeCol
  const resumed: TypewriterState = { ...withCursor(state, { col: to }), resumeCol: null }
  const result = then(resumed)
  return { state: result.state, events: [{ type: 'skip', from, to }, ...result.events] }
}

/** Moves the carriage right by `by` columns without printing (space and tab). */
function advance(state: TypewriterState, by: number, event: TypewriterEvent): Result {
  const { col } = state.cursor
  if (isLocked(col)) return { state, events: [{ type: 'lock' }] }
  const to = Math.min(RIGHT_MARGIN, col + by)
  const events: TypewriterEvent[] = [event]
  // The bell rings once per crossing of the bell column, however the carriage got there.
  if (col < BELL_COL && to >= BELL_COL) events.push({ type: 'bell' })
  return { state: withCursor(state, { col: to }), events }
}

function carriageReturn(state: TypewriterState): Result {
  const { cursor, doc } = state
  const events: TypewriterEvent[] = [{ type: 'return', from: cursor.col }, { type: 'lineFeed' }]
  if (cursor.row + 1 < PAGE_ROWS) {
    return { state: withCursor(state, { col: 0, row: cursor.row + 1 }), events }
  }
  // Last line: the sheet is full. A new one is fed into the same document.
  const next: TypewriterState = {
    ...state,
    doc: { ...doc, pages: [...doc.pages, { strikes: [] }] },
    cursor: { page: cursor.page + 1, row: 0, col: 0 },
  }
  events.push({ type: 'pageFull', page: cursor.page })
  return { state: next, events }
}
