import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createState } from '../src/core/carriage'
import { createDocument } from '../src/core/page'
import { createArchive } from '../src/features/archive/archive'
import { createStoredDataStore, STORAGE_KEY, type KeyValueStorage } from '../src/features/archive/storedData'
import { createSession } from '../src/features/session/session'

function memoryStorage() {
  const map = new Map<string, string>()
  const storage: KeyValueStorage = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  }
  return { storage, map }
}

function setup(storage = memoryStorage().storage) {
  let clock = 1000
  let n = 0
  const stored = createStoredDataStore(storage, 0)
  const session = createSession(createState(createDocument('boot', 0, 0)))
  const archive = createArchive(stored, session, {
    now: () => ++clock,
    newId: () => `doc-${++n}`,
    newSeed: () => 7,
    saveDelayMs: 100,
  })
  return { stored, session, archive, storage }
}

const type = (session: ReturnType<typeof createSession>, text: string) => {
  for (const char of text) session.dispatch(char === ' ' ? { type: 'space' } : { type: 'char', char })
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('archive', () => {
  it('starts a blank sheet on a first visit', () => {
    const { archive, session } = setup()
    archive.start()
    expect(session.getState().doc.id).toBe('doc-1')
    expect(archive.activeId()).toBe('doc-1')
  })

  it('saves typing automatically, after a short pause', () => {
    const { archive, session, stored } = setup()
    archive.start()
    type(session, 'hello')
    expect(stored.get().documents[0].pages[0]).toHaveLength(0)
    vi.advanceTimersByTime(100)
    expect(stored.get().documents[0].pages[0]).toHaveLength(5)
    expect(stored.get().activeId).toBe('doc-1')
  })

  it('restores the sheet and the carriage position after a reload', () => {
    const { storage, ...first } = setup()
    const stop = first.archive.start()
    type(first.session, 'dear diary')
    first.session.dispatch({ type: 'return' })
    type(first.session, 'abc')
    stop()
    first.stored.flush()

    const second = setup(storage)
    second.archive.start()
    const state = second.session.getState()
    expect(state.doc.id).toBe('doc-1')
    expect(state.doc.pages[0].strikes).toHaveLength(10 - 1 + 3)
    expect(state.cursor).toMatchObject({ row: 1, col: 3 })
  })

  it('keeps the previous sheet when a new one is started, and drops a blank one', () => {
    const { archive, session } = setup()
    archive.start()
    archive.newDocument() // the first sheet was never used: it is dropped
    expect(archive.list().map((d) => d.id)).toEqual(['doc-2'])

    type(session, 'one')
    archive.newDocument()
    type(session, 'two')
    vi.advanceTimersByTime(100)
    const ids = archive.list().map((d) => d.id)
    expect(ids).toHaveLength(2)
    expect(ids).toContain('doc-2')
    expect(ids).toContain('doc-3')
  })

  it('opens another sheet and continues where it stopped', () => {
    const { archive, session } = setup()
    archive.start()
    type(session, 'first')
    archive.newDocument()
    type(session, 'second')
    archive.open('doc-1')
    expect(session.getState().doc.id).toBe('doc-1')
    expect(session.getState().cursor.col).toBe(5)
    type(session, '!')
    expect(session.getState().doc.pages[0].strikes.at(-1)?.char).toBe('!')
    expect(session.getState().doc.pages[0].strikes).toHaveLength(6)
  })

  it('ignores opening an unknown or the current sheet', () => {
    const { archive, session } = setup()
    archive.start()
    archive.open('nope')
    archive.open(session.getState().doc.id)
    expect(session.getState().doc.id).toBe('doc-1')
  })

  it('renames a sheet, and the new title survives further typing', () => {
    const { archive, session } = setup()
    archive.start()
    type(session, 'abc')
    archive.rename('doc-1', '  Letter to Anna  ')
    type(session, 'def')
    vi.advanceTimersByTime(100)
    expect(archive.list()[0]).toMatchObject({ title: 'Letter to Anna', strikes: 6 })
  })

  it('summarises a sheet by its first line of text', () => {
    const { archive, session } = setup()
    archive.start()
    session.dispatch({ type: 'return' })
    type(session, 'second line first')
    vi.advanceTimersByTime(100)
    expect(archive.list()[0].preview).toBe('second line first')
  })

  it('deletes a sheet; deleting the open one opens the next, or a blank one', () => {
    const { archive, session } = setup()
    archive.start()
    type(session, 'keep')
    archive.newDocument()
    type(session, 'drop')
    expect(session.getState().doc.id).toBe('doc-2')
    archive.remove('doc-2')
    expect(session.getState().doc.id).toBe('doc-1')
    expect(archive.list().map((d) => d.id)).toEqual(['doc-1'])
    archive.remove('doc-1')
    expect(session.getState().doc.id).toBe('doc-3')
    expect(session.getState().doc.pages[0].strikes).toHaveLength(0)
  })

  it('does not write a deleted sheet back through a pending autosave', () => {
    const { archive, session } = setup()
    archive.start()
    type(session, 'abc')
    archive.newDocument()
    type(session, 'xyz')
    archive.remove('doc-2')
    vi.advanceTimersByTime(500)
    expect(archive.list().some((d) => d.id === 'doc-2')).toBe(false)
  })

  it('notifies subscribers when the list changes', () => {
    const { archive, session } = setup()
    archive.start()
    let n = 0
    archive.subscribe(() => n++)
    type(session, 'a')
    vi.advanceTimersByTime(100)
    expect(n).toBeGreaterThan(0)
  })

  it('persists in the browser format under the storage key', () => {
    const { storage, ...s } = setup()
    s.archive.start()
    type(s.session, 'a')
    vi.advanceTimersByTime(100)
    s.stored.flush()
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}').documents).toHaveLength(1)
  })
})
