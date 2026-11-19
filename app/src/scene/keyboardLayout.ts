/**
 * The keyboard of the typewriter model: 4 rows of 11 keys, back row first, each row left to right
 * as `scripts/model/build.mjs` numbered them (`key_<row>_<col>`). The legends match the ones
 * printed on the model's keys.
 */
import { hashString } from '../core/ink'
import layout from './modelLayout.json'

export type KeyRole = 'char' | 'backspace' | 'return' | 'shift'

interface Legend {
  readonly base: string
  readonly shift: string
  readonly role: KeyRole
}

const C = (pair: string): Legend => ({ base: pair[0], shift: pair[1], role: 'char' })
const SPECIAL = (role: KeyRole): Legend => ({ base: '', shift: '', role })

/** Legends by row and column, as printed on the model. */
const LEGENDS: readonly (readonly Legend[])[] = [
  ['1!', '2?', '3#', '4$', '5%', '6^', '7&', '8*', '9(', '0)', '-_'].map(C),
  [...['qQ', 'wW', 'eE', 'rR', 'tT', 'yY', 'uU', 'iI', 'oO', 'pP'].map(C), SPECIAL('backspace')],
  [...['aA', 'sS', 'dD', 'fF', 'gG', 'hH', 'jJ', 'kK', 'lL', ';:'].map(C), SPECIAL('return')],
  [...['zZ', 'xX', 'cC', 'vV', 'bB', 'nN', 'mM', ',<', '.>', '\'"'].map(C), SPECIAL('shift')],
]

export interface KeyDef extends Legend {
  readonly index: number
  /** Node name in the model. */
  readonly node: string
  readonly row: number
  readonly col: number
  /** Distance from the lever's pivot to the cap, cm: a press turns the key by depth / arm. */
  readonly arm: number
  /** Cap centre, scene cm. */
  readonly cap: readonly number[]
}

export const KEYS: readonly KeyDef[] = layout.keys.map((k, index) => {
  const legend = LEGENDS[k.row]?.[k.col] ?? SPECIAL('char')
  return { ...legend, index, node: k.name, row: k.row, col: k.col, arm: k.arm, cap: k.cap }
})

export const KEY_COUNT = KEYS.length
/** Index of the space bar in the per-key animation arrays. */
export const SPACE_INDEX = KEY_COUNT

const roleKey = (role: KeyRole) => KEYS.find((k) => k.role === role)?.index ?? -1
export const BACKSPACE_KEY = roleKey('backspace')
export const RETURN_KEY = roleKey('return')
export const SHIFT_KEY = roleKey('shift')

const CHAR_KEYS = KEYS.filter((k) => k.role === 'char')
const BY_CHAR = new Map<string, { key: number; shifted: boolean }>()
for (const k of CHAR_KEYS) {
  BY_CHAR.set(k.base, { key: k.index, shifted: false })
  if (!BY_CHAR.has(k.shift)) BY_CHAR.set(k.shift, { key: k.index, shifted: true })
}

/**
 * The key that types a character, and whether shift is held. Accented letters use the key of
 * their base letter; anything else gets a stable character key.
 */
export function keyFor(char: string): { key: number; shifted: boolean } {
  const hit = BY_CHAR.get(char)
  if (hit) return hit
  const folded = char.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const base = BY_CHAR.get(folded) ?? BY_CHAR.get(folded.toLowerCase())
  if (base) return { key: base.key, shifted: base.shifted || folded !== folded.toLowerCase() }
  return { key: CHAR_KEYS[hashString(char) % CHAR_KEYS.length].index, shifted: false }
}

export function keyIndexFor(char: string): number {
  return keyFor(char).key
}

/**
 * Typebar for each character key: bars and keys are both ordered left to right across the
 * machine (keys by column, back row first within a column), and spread evenly over the bars.
 */
export const BAR_OF_KEY: readonly number[] = (() => {
  const bars = layout.bars.length
  const order = [...CHAR_KEYS].sort((a, b) => a.cap[0] - b.cap[0] || a.row - b.row)
  const map = new Array<number>(KEY_COUNT).fill(-1)
  order.forEach((k, rank) => {
    map[k.index] = Math.round((rank * (bars - 1)) / Math.max(1, order.length - 1))
  })
  return map
})()
