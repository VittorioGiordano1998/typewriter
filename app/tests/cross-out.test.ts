import { describe, expect, it } from 'vitest'
import { createState, CROSS_OUT_CHAR, reduce, type Action, type TypewriterEvent, type TypewriterState } from '../src/core/carriage'
import { documentToText } from '../src/core/export-text'
import { createDocument, RIGHT_MARGIN } from '../src/core/page'

function run(actions: readonly Action[], start: TypewriterState = createState(createDocument('d', 3, 0))) {
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
const X: Action = { type: 'crossOut' }

describe('cross-out (Backspace in cross-out mode)', () => {
  it('strikes an X over the previous character and leaves the carriage on it', () => {
    const { state, events } = run([...chars('cat'), X])
    const strikes = state.doc.pages[0].strikes
    expect(strikes.at(-1)).toMatchObject({ col: 2, char: CROSS_OUT_CHAR })
    expect(state.cursor.col).toBe(2)
    expect(state.resumeCol).toBe(3)
    expect(events.slice(-2).map((e) => e.type)).toEqual(['backspace', 'strike'])
  })

  it('crosses out further back on each press', () => {
    const { state } = run([...chars('cat'), X, X, X])
    expect(state.doc.pages[0].strikes.filter((s) => s.char === CROSS_OUT_CHAR).map((s) => s.col)).toEqual([2, 1, 0])
    expect(state.cursor.col).toBe(0)
    expect(state.resumeCol).toBe(3)
  })

  it('does nothing at the left margin', () => {
    const { state, events } = run([X])
    expect(state.doc.pages[0].strikes).toHaveLength(0)
    expect(events).toHaveLength(0)
    const after = run([...chars('ab'), X, X, X])
    expect(after.state.doc.pages[0].strikes).toHaveLength(4)
  })

  it('continues typing where the line ended, sliding the carriage back there first', () => {
    const { state, events } = run([...chars('helo'), X, X, ...chars('lo')])
    expect(documentToText(state.doc)).toBe('heXXlo')
    expect(state.cursor.col).toBe(6)
    expect(state.resumeCol).toBeNull()
    expect(events.find((e) => e.type === 'skip')).toEqual({ type: 'skip', from: 2, to: 4 })
  })

  it('resumes before a space or a tab too', () => {
    expect(run([...chars('ab'), X, { type: 'space' }]).state.cursor.col).toBe(3)
    expect(run([...chars('ab'), X, { type: 'tab' }]).state.cursor.col).toBe(5)
  })

  it('forgets the resume point on a carriage return or a plain backspace', () => {
    const afterReturn = run([...chars('ab'), X, { type: 'return' }, ...chars('c')]).state
    expect(afterReturn.cursor).toMatchObject({ row: 1, col: 1 })
    const afterMove = run([...chars('abc'), X, { type: 'backspace' }, ...chars('Z')]).state
    // The plain backspace moved from column 2 to 1, and Z overstrikes there.
    expect(afterMove.doc.pages[0].strikes.at(-1)).toMatchObject({ col: 1, char: 'Z' })
  })

  it('works from the locked margin', () => {
    const { state, events } = run([...chars('x'.repeat(RIGHT_MARGIN)), X, ...chars('y')])
    const strikes = state.doc.pages[0].strikes
    // Back at the margin: the carriage is locked again, so y prints nothing and the X is the last strike.
    expect(strikes).toHaveLength(RIGHT_MARGIN + 1)
    expect(strikes.at(-1)).toMatchObject({ col: RIGHT_MARGIN - 1, char: CROSS_OUT_CHAR })
    expect(state.cursor.col).toBe(RIGHT_MARGIN)
    expect(events.at(-1)).toEqual({ type: 'lock' })
  })

  it('never rings the bell when the carriage slides back past the bell column', () => {
    const line = chars('x'.repeat(60))
    const { events } = run([...line, X, X, X, X, ...chars('a')])
    expect(events.filter((e) => e.type === 'bell')).toHaveLength(1)
  })
})
