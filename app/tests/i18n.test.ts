import { describe, expect, it } from 'vitest'
import { en } from '../src/features/i18n/en'
import { it as italian } from '../src/features/i18n/it'

describe('dictionaries', () => {
  it('have exactly the same keys', () => {
    expect(Object.keys(italian).sort()).toEqual(Object.keys(en).sort())
  })

  it('have no empty strings', () => {
    for (const [dict, name] of [
      [en, 'en'],
      [italian, 'it'],
    ] as const) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim(), `${name}.${key}`).not.toBe('')
      }
    }
  })

  it('translate the text, rather than repeat the English', () => {
    const same = Object.keys(en).filter((k) => (en as Record<string, string>)[k] === (italian as Record<string, string>)[k])
    // Words spelled the same in both languages are fine; everything else must differ.
    const SAME_IN_BOTH = ['volume']
    expect(same.filter((k) => !SAME_IN_BOTH.includes(k)).sort()).toEqual([])
  })
})
