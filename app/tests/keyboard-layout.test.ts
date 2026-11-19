import { describe, expect, it } from 'vitest'
import { BACKSPACE_KEY, BAR_OF_KEY, KEY_COUNT, KEYS, keyFor, RETURN_KEY, SHIFT_KEY } from '../src/scene/keyboardLayout'
import layout from '../src/scene/modelLayout.json'

describe('keyboard layout of the model', () => {
  it('has the 44 keys of the model in 4 rows of 11', () => {
    expect(KEY_COUNT).toBe(44)
    expect(layout.rows).toEqual([11, 11, 11, 11])
  })

  it('maps letters to the keys printed with them', () => {
    expect(KEYS[keyFor('q').key]).toMatchObject({ row: 1, col: 0 })
    expect(KEYS[keyFor('p').key]).toMatchObject({ row: 1, col: 9 })
    expect(KEYS[keyFor('a').key]).toMatchObject({ row: 2, col: 0 })
    expect(KEYS[keyFor('m').key]).toMatchObject({ row: 3, col: 6 })
    expect(KEYS[keyFor('1').key]).toMatchObject({ row: 0, col: 0 })
  })

  it('holds shift for capitals and shifted symbols, not for plain ones', () => {
    expect(keyFor('A')).toEqual({ key: keyFor('a').key, shifted: true })
    expect(keyFor('?')).toEqual({ key: keyFor('2').key, shifted: true })
    expect(keyFor('a').shifted).toBe(false)
  })

  it('types accented letters on the key of their base letter', () => {
    expect(keyFor('à').key).toBe(keyFor('a').key)
    expect(keyFor('è').key).toBe(keyFor('e').key)
    expect(keyFor('È')).toEqual({ key: keyFor('e').key, shifted: true })
  })

  it('gives unknown characters a stable character key', () => {
    const k = keyFor('§')
    expect(k).toEqual(keyFor('§'))
    expect(KEYS[k.key].role).toBe('char')
  })

  it('has a backspace, a return and a shift key that are not character keys', () => {
    for (const i of [BACKSPACE_KEY, RETURN_KEY, SHIFT_KEY]) {
      expect(i).toBeGreaterThanOrEqual(0)
      expect(KEYS[i].role).not.toBe('char')
      expect(BAR_OF_KEY[i]).toBe(-1)
    }
  })

  it('gives every character key its own typebar, in left-to-right order', () => {
    const bars = KEYS.filter((k) => k.role === 'char').map((k) => BAR_OF_KEY[k.index])
    expect(new Set(bars).size).toBe(bars.length)
    for (const b of bars) {
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(layout.bars.length)
    }
    const left = KEYS.find((k) => k.row === 1 && k.col === 0)
    const right = KEYS.find((k) => k.row === 1 && k.col === 9)
    expect(BAR_OF_KEY[left?.index ?? 0]).toBeLessThan(BAR_OF_KEY[right?.index ?? 0])
  })
})
