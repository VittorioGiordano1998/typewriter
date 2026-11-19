import { describe, expect, it } from 'vitest'
import { createState, reduce, type Action } from '../src/core/carriage'
import { createDocument } from '../src/core/page'
import {
  DEFAULT_SETTINGS,
  emptyData,
  fromStored,
  parse,
  SCHEMA_VERSION,
  serialize,
  toStored,
  type StoredData,
} from '../src/core/storage-schema'

function sample() {
  const actions: Action[] = [
    { type: 'char', char: 'a' },
    { type: 'ribbon', ribbon: 'red' },
    { type: 'char', char: 'é' },
    { type: 'return' },
    { type: 'char', char: 'z' },
  ]
  let state = createState(createDocument('doc-1', 42, 5, 'Letter'))
  for (const a of actions) state = reduce(state, a, 99).state
  return state
}

function dataWith(...states: ReturnType<typeof sample>[]): StoredData {
  return {
    version: SCHEMA_VERSION,
    activeId: states[0]?.doc.id ?? null,
    documents: states.map((s) => toStored(s.doc, s.cursor)),
    settings: { ...DEFAULT_SETTINGS, language: 'it', lamp: 0.3, night: true },
  }
}

describe('storage schema', () => {
  it('round-trips a document and the settings', () => {
    const s = sample()
    const result = parse(serialize(dataWith(s)))
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data.settings).toMatchObject({ language: 'it', lamp: 0.3, night: true })
    expect(result.data.activeId).toBe('doc-1')
    const back = fromStored(result.data.documents[0])
    expect(back.doc).toEqual(s.doc)
    expect(back.cursor).toEqual(s.cursor)
  })

  it('migrates existing settings and persists a chosen interface theme', () => {
    const legacy = parse(JSON.stringify({ version: 1, documents: [], settings: { language: 'it' } }))
    if (legacy.kind !== 'ok') throw new Error('expected ok')
    expect(legacy.data.settings.theme).toBe('classic')
    const saved = parse(serialize({ ...legacy.data, settings: { ...legacy.data.settings, theme: 'forest' } }))
    if (saved.kind !== 'ok') throw new Error('expected ok')
    expect(saved.data.settings.theme).toBe('forest')
    const invalid = parse(JSON.stringify({ version: 2, settings: { theme: 'unknown' } }))
    if (invalid.kind !== 'ok') throw new Error('expected ok')
    expect(invalid.data.settings.theme).toBe('classic')
  })

  it('stores strikes sparsely, as tuples', () => {
    const stored = toStored(sample().doc, { page: 0, row: 1, col: 1 })
    expect(stored.pages[0][1]).toEqual([1, 0, 'é', 1, expect.any(Number)])
  })

  it('yields an empty archive for corrupt JSON, not a crash', () => {
    expect(parse('{not json')).toEqual({ kind: 'empty' })
    expect(parse('')).toEqual({ kind: 'empty' })
    expect(parse(null)).toEqual({ kind: 'empty' })
    expect(parse('[1,2]')).toEqual({ kind: 'empty' })
  })

  it('refuses data written by a newer version, so it is never overwritten', () => {
    expect(parse(JSON.stringify({ version: SCHEMA_VERSION + 1, documents: [] }))).toEqual({
      kind: 'newer',
      version: SCHEMA_VERSION + 1,
    })
  })

  it('accepts a payload without a version and fills the current schema', () => {
    const result = parse(JSON.stringify({ documents: [] }))
    expect(result).toEqual({ kind: 'ok', data: emptyData() })
  })

  it('drops unusable documents and strikes but keeps the rest', () => {
    const good = toStored(sample().doc, { page: 0, row: 1, col: 1 })
    const payload = {
      version: SCHEMA_VERSION,
      activeId: 'gone',
      documents: [
        { nope: true },
        { ...good, id: 'dup' },
        { ...good, id: 'dup' },
        { ...good, id: 'bad-strikes', pages: [[[999, 0, 'a', 0, 1], [0, 0, '', 0, 1], [0, 0, 'ok', 5, 1], [3, 2, 'k', 0, 7]]] },
      ],
      settings: { language: 'xx', lamp: 5, volume: -2, ribbon: 'green', night: 'yes' },
    }
    const result = parse(JSON.stringify(payload))
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data.documents.map((d) => d.id)).toEqual(['dup', 'bad-strikes'])
    expect(result.data.documents[1].pages[0]).toEqual([[3, 2, 'k', 0, 7]])
    expect(result.data.activeId).toBeNull()
    expect(result.data.settings).toEqual({ ...DEFAULT_SETTINGS, lamp: 1, volume: 0 })
  })

  it('keeps strikeCount at least as large as the strikes present', () => {
    const good = toStored(sample().doc, { page: 0, row: 1, col: 1 })
    const result = parse(JSON.stringify({ version: 1, documents: [{ ...good, strikeCount: 0 }] }))
    if (result.kind !== 'ok') throw new Error('expected ok')
    expect(result.data.documents[0].strikeCount).toBe(3)
  })
})
