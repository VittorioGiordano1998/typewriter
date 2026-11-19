import { describe, expect, it } from 'vitest'
import { createState, type TypewriterEvent } from '../src/core/carriage'
import { createDocument } from '../src/core/page'
import { createSession } from '../src/features/session/session'
import { PAGE_FEED_MS, returnDurationMs } from '../src/features/session/timing'

function newSession() {
  return createSession(createState(createDocument('s1', 1, 0)))
}

describe('session', () => {
  it('applies actions and notifies subscribers once per state change', () => {
    const session = newSession()
    let notified = 0
    session.subscribe(() => notified++)
    session.dispatch({ type: 'char', char: 'a' })
    session.dispatch({ type: 'backspace' })
    session.dispatch({ type: 'backspace' }) // nothing to do at column 0: no state change
    expect(notified).toBe(2)
    expect(session.getState().cursor.col).toBe(0)
  })

  it('emits the events of each action, in order', () => {
    const session = newSession()
    const seen: TypewriterEvent['type'][] = []
    session.onEvent((e) => seen.push(e.type))
    session.dispatch({ type: 'char', char: 'a' })
    session.dispatch({ type: 'return' })
    expect(seen).toEqual(['strike', 'return', 'lineFeed'])
  })

  it('returns the events from dispatch', () => {
    const events = newSession().dispatch({ type: 'char', char: 'a' })
    expect(events.map((e) => e.type)).toEqual(['strike'])
  })

  it('stops notifying after unsubscribe', () => {
    const session = newSession()
    let n = 0
    const off = session.onEvent(() => n++)
    session.dispatch({ type: 'char', char: 'a' })
    off()
    session.dispatch({ type: 'char', char: 'b' })
    expect(n).toBe(1)
  })

  it('replaces the whole state on load', () => {
    const session = newSession()
    session.dispatch({ type: 'char', char: 'a' })
    session.load(createState(createDocument('other', 2, 0)))
    expect(session.getState().doc.id).toBe('other')
    expect(session.getState().cursor.col).toBe(0)
  })
})

describe('timing', () => {
  it('makes a longer carriage return take longer', () => {
    expect(returnDurationMs(0)).toBeLessThan(returnDurationMs(30))
    expect(returnDurationMs(30)).toBeLessThan(returnDurationMs(65))
  })

  it('keeps the page feed longer than any return', () => {
    expect(PAGE_FEED_MS).toBeGreaterThan(returnDurationMs(65))
  })
})
