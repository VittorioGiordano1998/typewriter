import { describe, expect, it } from 'vitest'
import { createState, reduce, type Action } from '../src/core/carriage'
import { documentToText } from '../src/core/export-text'
import { createDocument, PAGE_ROWS } from '../src/core/page'

function typed(actions: readonly Action[]) {
  let state = createState(createDocument('d', 1, 0))
  for (const a of actions) state = reduce(state, a).state
  return state.doc
}
const chars = (s: string): Action[] => [...s].map((char) => ({ type: 'char', char }))
const ret: Action = { type: 'return' }

describe('documentToText', () => {
  it('writes lines and trims trailing spaces', () => {
    const doc = typed([...chars('hi'), { type: 'space' }, { type: 'space' }, ret, ...chars('yo')])
    expect(documentToText(doc)).toBe('hi\nyo')
  })

  it('keeps the gap between words', () => {
    expect(documentToText(typed([...chars('a'), { type: 'space' }, ...chars('b')]))).toBe('a b')
  })

  it('takes the last strike per cell, so an overstruck X replaces the letter', () => {
    const doc = typed([...chars('cat'), { type: 'backspace' }, ...chars('X')])
    expect(documentToText(doc)).toBe('caX')
  })

  it('keeps empty lines between text', () => {
    expect(documentToText(typed([...chars('a'), ret, ret, ...chars('b')]))).toBe('a\n\nb')
  })

  it('separates pages with a form feed and drops a trailing blank page', () => {
    const toNewPage: Action[] = Array.from({ length: PAGE_ROWS }, () => ret)
    const two = typed([...chars('one'), ...toNewPage, ...chars('two')])
    expect(documentToText(two)).toBe('one\f' + 'two')
    const blankTail = typed([...chars('one'), ...toNewPage])
    expect(documentToText(blankTail)).toBe('one')
  })

  it('is empty for an empty document', () => {
    expect(documentToText(createDocument('d', 1, 0))).toBe('')
  })
})
