import { describe, expect, it } from 'vitest'
import {
  createState,
  reduce,
  type Action,
  type TypewriterEvent,
  type TypewriterState,
} from '../src/core/carriage'
import { BELL_COL, createDocument, PAGE_ROWS, RIGHT_MARGIN, TAB_WIDTH } from '../src/core/page'

function fresh(): TypewriterState {
  return createState(createDocument('d1', 7, 1000))
}

function run(actions: readonly Action[], start: TypewriterState = fresh()) {
  let state = start
  const events: TypewriterEvent[] = []
  for (const a of actions) {
    const r = reduce(state, a)
    state = r.state
    events.push(...r.events)
  }
  return { state, events }
}

const chars = (s: string): Action[] => [...s].map((char) => ({ type: 'char', char }))
const count = (events: readonly TypewriterEvent[], type: TypewriterEvent['type']) =>
  events.filter((e) => e.type === type).length

describe('typing', () => {
  it('records a strike at the current cell and advances the column by one', () => {
    const { state, events } = run(chars('a'))
    const strikes = state.doc.pages[0].strikes
    expect(strikes).toHaveLength(1)
    expect(strikes[0]).toMatchObject({ col: 0, row: 0, char: 'a', ribbon: 'black' })
    expect(state.cursor).toEqual({ page: 0, row: 0, col: 1 })
    expect(events[0]).toMatchObject({ type: 'strike' })
  })

  it('moves the carriage on a space without striking', () => {
    const { state, events } = run([{ type: 'space' }])
    expect(state.doc.pages[0].strikes).toHaveLength(0)
    expect(state.cursor.col).toBe(1)
    expect(events).toEqual([{ type: 'space' }])
  })

  it('treats a typed space character as a space', () => {
    const { state } = run(chars(' '))
    expect(state.doc.pages[0].strikes).toHaveLength(0)
    expect(state.cursor.col).toBe(1)
  })

  it('stamps the active ribbon colour at strike time', () => {
    const { state } = run([
      { type: 'char', char: 'a' },
      { type: 'ribbon', ribbon: 'red' },
      { type: 'char', char: 'b' },
    ])
    expect(state.doc.pages[0].strikes.map((s) => s.ribbon)).toEqual(['black', 'red'])
  })

  it('gives every strike a distinct, reproducible seed', () => {
    const a = run(chars('abc')).state.doc.pages[0].strikes.map((s) => s.seed)
    const b = run(chars('abc')).state.doc.pages[0].strikes.map((s) => s.seed)
    expect(new Set(a).size).toBe(3)
    expect(a).toEqual(b)
  })
})

describe('backspace and overstrike', () => {
  it('moves back one column, removes nothing, and the next character stacks in the same cell', () => {
    const { state } = run([...chars('a'), { type: 'backspace' }, ...chars('X')])
    const strikes = state.doc.pages[0].strikes
    expect(strikes).toHaveLength(2)
    expect(strikes.map((s) => [s.col, s.char])).toEqual([
      [0, 'a'],
      [0, 'X'],
    ])
    expect(state.cursor.col).toBe(1)
  })

  it('does nothing at column 0', () => {
    const { state, events } = run([{ type: 'backspace' }])
    expect(state.cursor.col).toBe(0)
    expect(events).toHaveLength(0)
  })
})

describe('bell and margin lock', () => {
  const lineOf = (n: number): Action[] => chars('x'.repeat(n))

  it('rings once per line, exactly when the column reaches the bell column', () => {
    const before = run(lineOf(BELL_COL - 1))
    expect(count(before.events, 'bell')).toBe(0)
    const at = run(lineOf(BELL_COL))
    expect(count(at.events, 'bell')).toBe(1)
    expect(at.state.cursor.col).toBe(BELL_COL)
    const past = run(lineOf(RIGHT_MARGIN))
    expect(count(past.events, 'bell')).toBe(1)
  })

  it('rings again on the next line', () => {
    const { events } = run([...lineOf(BELL_COL), { type: 'return' }, ...lineOf(BELL_COL)])
    expect(count(events, 'bell')).toBe(2)
  })

  it('rings when a tab or spaces cross the bell column', () => {
    const { events } = run(Array.from({ length: BELL_COL }, () => ({ type: 'space' }) as Action))
    expect(count(events, 'bell')).toBe(1)
  })

  it('locks at the right margin: no strike, no movement, a lock event', () => {
    const { state } = run(lineOf(RIGHT_MARGIN))
    expect(state.cursor.col).toBe(RIGHT_MARGIN)
    const strikesBefore = state.doc.pages[0].strikes.length
    const next = reduce(state, { type: 'char', char: 'z' })
    expect(next.state).toBe(state)
    expect(next.state.doc.pages[0].strikes).toHaveLength(strikesBefore)
    expect(next.events).toEqual([{ type: 'lock' }])
    expect(reduce(state, { type: 'space' }).events).toEqual([{ type: 'lock' }])
  })

  it('still lets the carriage move back when locked', () => {
    const { state } = run([...lineOf(RIGHT_MARGIN), { type: 'backspace' }, ...chars('Q')])
    expect(state.doc.pages[0].strikes.at(-1)).toMatchObject({ char: 'Q', col: RIGHT_MARGIN - 1 })
  })
})

describe('tab', () => {
  it('advances to the next tab stop', () => {
    expect(run([{ type: 'tab' }]).state.cursor.col).toBe(TAB_WIDTH)
    expect(run([...chars('ab'), { type: 'tab' }]).state.cursor.col).toBe(TAB_WIDTH)
    expect(run([...chars('abcde'), { type: 'tab' }]).state.cursor.col).toBe(TAB_WIDTH * 2)
  })

  it('is clamped at the margin', () => {
    const { state } = run([...chars('x'.repeat(RIGHT_MARGIN - 2)), { type: 'tab' }])
    expect(state.cursor.col).toBe(RIGHT_MARGIN)
  })
})

describe('carriage return', () => {
  it('goes to the left margin and the next line, with a line feed', () => {
    const { state, events } = run([...chars('abc'), { type: 'return' }])
    expect(state.cursor).toEqual({ page: 0, row: 1, col: 0 })
    expect(events.map((e) => e.type)).toEqual(['strike', 'strike', 'strike', 'return', 'lineFeed'])
  })

  it('feeds a new page from the last line and keeps typing on row 0 of the new page', () => {
    const returns: Action[] = Array.from({ length: PAGE_ROWS }, () => ({ type: 'return' }))
    const { state, events } = run([...returns, ...chars('z')])
    expect(count(events, 'pageFull')).toBe(1)
    expect(state.doc.pages).toHaveLength(2)
    expect(state.doc.pages[0].strikes).toHaveLength(0)
    expect(state.doc.pages[1].strikes[0]).toMatchObject({ row: 0, col: 0, char: 'z' })
    expect(state.cursor.page).toBe(1)
  })
})

describe('immutability', () => {
  it('never mutates the previous state', () => {
    const s0 = fresh()
    const s1 = reduce(s0, { type: 'char', char: 'a' }).state
    expect(s0.doc.pages[0].strikes).toHaveLength(0)
    expect(s0.cursor.col).toBe(0)
    expect(s1.doc.pages[0].strikes).toHaveLength(1)
  })
})
