import { describe, expect, it } from 'vitest'
import { createState, reduce, type Action } from '../src/core/carriage'
import { createDocument, PAGE_ROWS } from '../src/core/page'
import { exportFileName, printablePages } from '../src/features/export/exportNames'

const DAY = new Date(2026, 10, 19, 12).getTime()

describe('exportFileName', () => {
  it('uses the title and the date', () => {
    expect(exportFileName('Letter to Anna', DAY, 'pdf')).toBe('Letter-to-Anna-2026-11-19.pdf')
  })

  it('falls back to "typewriter" for an empty or symbol-only title', () => {
    expect(exportFileName('', DAY, 'txt')).toBe('typewriter-2026-11-19.txt')
    expect(exportFileName('???', DAY, 'txt')).toBe('typewriter-2026-11-19.txt')
  })

  it('strips accents and path characters', () => {
    expect(exportFileName('Più caffè/../x', DAY, 'png')).toBe('Piu-caffe-x-2026-11-19.png')
  })

  it('adds a suffix before the extension and keeps names short', () => {
    expect(exportFileName('a'.repeat(200), DAY, 'png', '-p2').length).toBeLessThan(70)
    expect(exportFileName('x', DAY, 'png', '-p2')).toBe('x-2026-11-19-p2.png')
  })
})

describe('printablePages', () => {
  const run = (actions: Action[]) => {
    let s = createState(createDocument('d', 1, 0))
    for (const a of actions) s = reduce(s, a).state
    return s.doc
  }

  it('is one page for a blank document', () => {
    expect(printablePages(createDocument('d', 1, 0))).toHaveLength(1)
  })

  it('drops a blank page fed after the last return', () => {
    const toNewPage: Action[] = Array.from({ length: PAGE_ROWS }, () => ({ type: 'return' }))
    expect(printablePages(run([{ type: 'char', char: 'a' }, ...toNewPage]))).toHaveLength(1)
    expect(printablePages(run([{ type: 'char', char: 'a' }, ...toNewPage, { type: 'char', char: 'b' }]))).toHaveLength(2)
  })
})
