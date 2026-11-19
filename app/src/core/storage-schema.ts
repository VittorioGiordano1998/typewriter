/**
 * Versioned persistence schema. Pure functions over strings: the actual `localStorage` access
 * lives in `features/archive`. Strikes are stored sparsely as tuples to keep documents small.
 */
import type { Cursor } from './carriage'
import { PAGE_ROWS, RIGHT_MARGIN, type Page, type Ribbon, type Strike, type TypewriterDocument } from './page'

/** Bump when the stored shape changes and add a migration step in `migrate`. */
export const SCHEMA_VERSION = 1

export type Language = 'it' | 'en'

/** What Backspace does: cross the previous character out with an X, or only move the carriage back. */
export type BackspaceMode = 'crossOut' | 'move'

export interface Settings {
  readonly language: Language
  readonly ribbon: Ribbon
  /** Lamp intensity, 0..1. */
  readonly lamp: number
  readonly night: boolean
  /** Master volume, 0..1. */
  readonly volume: number
  readonly muted: boolean
  readonly backspace: BackspaceMode
}

export const DEFAULT_SETTINGS: Settings = {
  language: 'en',
  ribbon: 'black',
  lamp: 0.8,
  night: false,
  volume: 0.8,
  muted: false,
  backspace: 'crossOut',
}

/** [col, row, char, ribbon (0 black, 1 red), seed] */
export type StoredStrike = readonly [number, number, string, number, number]

export interface StoredDocument {
  readonly id: string
  readonly title: string
  readonly createdAt: number
  readonly updatedAt: number
  readonly seed: number
  readonly strikeCount: number
  readonly cursor: Cursor
  readonly pages: readonly (readonly StoredStrike[])[]
}

export interface StoredData {
  readonly version: number
  readonly activeId: string | null
  readonly documents: readonly StoredDocument[]
  readonly settings: Settings
}

export type ParseResult =
  | { readonly kind: 'ok'; readonly data: StoredData }
  /** Nothing usable: empty input or corrupt JSON. Safe to start fresh. */
  | { readonly kind: 'empty' }
  /** Written by a newer version of the app. Must not be overwritten. */
  | { readonly kind: 'newer'; readonly version: number }

export function emptyData(): StoredData {
  return { version: SCHEMA_VERSION, activeId: null, documents: [], settings: DEFAULT_SETTINGS }
}

export function serialize(data: StoredData): string {
  return JSON.stringify({ ...data, version: SCHEMA_VERSION })
}

export function parse(json: string | null): ParseResult {
  if (!json) return { kind: 'empty' }
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { kind: 'empty' }
  }
  if (!isRecord(raw)) return { kind: 'empty' }
  const version = typeof raw.version === 'number' ? raw.version : 0
  if (version > SCHEMA_VERSION) return { kind: 'newer', version }
  return { kind: 'ok', data: migrate(raw) }
}

/**
 * Brings any stored payload to the current schema, dropping what cannot be trusted: bad
 * documents, out-of-range strikes, unknown settings. Future schema bumps add a step here.
 */
export function migrate(raw: Record<string, unknown>): StoredData {
  const documents: StoredDocument[] = []
  if (Array.isArray(raw.documents)) {
    for (const d of raw.documents) {
      const doc = sanitizeDocument(d)
      if (doc && !documents.some((x) => x.id === doc.id)) documents.push(doc)
    }
  }
  const activeId =
    typeof raw.activeId === 'string' && documents.some((d) => d.id === raw.activeId) ? raw.activeId : null
  return { version: SCHEMA_VERSION, activeId, documents, settings: sanitizeSettings(raw.settings) }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function int(v: unknown, lo: number, hi: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null
}

function unit(v: unknown, fallback: number): number {
  return Math.min(1, Math.max(0, num(v, fallback)))
}

export function sanitizeSettings(v: unknown): Settings {
  const s = isRecord(v) ? v : {}
  return {
    language: s.language === 'it' || s.language === 'en' ? s.language : DEFAULT_SETTINGS.language,
    ribbon: s.ribbon === 'red' ? 'red' : 'black',
    lamp: unit(s.lamp, DEFAULT_SETTINGS.lamp),
    night: s.night === true,
    volume: unit(s.volume, DEFAULT_SETTINGS.volume),
    muted: s.muted === true,
    backspace: s.backspace === 'move' ? 'move' : 'crossOut',
  }
}

function sanitizeStrike(v: unknown): StoredStrike | null {
  if (!Array.isArray(v) || v.length < 5) return null
  const col = int(v[0], 0, RIGHT_MARGIN - 1)
  const row = int(v[1], 0, PAGE_ROWS - 1)
  const ribbon = int(v[3], 0, 1)
  const seed = int(v[4], 0, 0xffffffff)
  const char = v[2]
  if (col === null || row === null || ribbon === null || seed === null) return null
  if (typeof char !== 'string' || char.length === 0 || char.length > 2) return null
  return [col, row, char, ribbon, seed]
}

function sanitizeDocument(v: unknown): StoredDocument | null {
  if (!isRecord(v) || typeof v.id !== 'string' || v.id.length === 0) return null
  const pages: StoredStrike[][] = []
  if (Array.isArray(v.pages)) {
    for (const p of v.pages) {
      const strikes: StoredStrike[] = []
      if (Array.isArray(p)) {
        for (const s of p) {
          const strike = sanitizeStrike(s)
          if (strike) strikes.push(strike)
        }
      }
      pages.push(strikes)
    }
  }
  if (pages.length === 0) pages.push([])
  const total = pages.reduce((n, p) => n + p.length, 0)
  const c = isRecord(v.cursor) ? v.cursor : {}
  const page = int(c.page, 0, pages.length - 1) ?? pages.length - 1
  const createdAt = num(v.createdAt, 0)
  return {
    id: v.id,
    title: typeof v.title === 'string' ? v.title.slice(0, 120) : '',
    createdAt,
    updatedAt: num(v.updatedAt, createdAt),
    seed: int(v.seed, 0, 0xffffffff) ?? 0,
    // Never below what is on the pages, so new strikes cannot reuse a seed.
    strikeCount: Math.max(total, num(v.strikeCount, 0)),
    cursor: { page, row: int(c.row, 0, PAGE_ROWS - 1) ?? 0, col: int(c.col, 0, RIGHT_MARGIN) ?? 0 },
    pages,
  }
}

export function toStored(doc: TypewriterDocument, cursor: Cursor): StoredDocument {
  return {
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    seed: doc.seed,
    strikeCount: doc.strikeCount,
    cursor,
    pages: doc.pages.map((p) => p.strikes.map((s): StoredStrike => [s.col, s.row, s.char, s.ribbon === 'red' ? 1 : 0, s.seed])),
  }
}

export function fromStored(d: StoredDocument): { doc: TypewriterDocument; cursor: Cursor } {
  const pages: Page[] = d.pages.map((p) => ({
    strikes: p.map(([col, row, char, ribbon, seed]): Strike => ({ col, row, char, ribbon: ribbon === 1 ? 'red' : 'black', seed })),
  }))
  return {
    doc: {
      id: d.id,
      title: d.title,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      seed: d.seed,
      strikeCount: d.strikeCount,
      pages,
    },
    cursor: d.cursor,
  }
}
