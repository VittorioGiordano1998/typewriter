/**
 * Page geometry and the document model. Pure data: no React, three.js or DOM.
 *
 * A sheet is an A4 page typed at pica pitch (10 characters per inch, 6 lines per inch). The
 * carriage column runs from 0 to RIGHT_MARGIN: column RIGHT_MARGIN is the locked position, where
 * the carriage cannot advance any further.
 */

/** Typeable columns per line; the carriage locks when it reaches this column. */
export const RIGHT_MARGIN = 65
/** Lines per sheet. Returning from the last line feeds a new sheet. */
export const PAGE_ROWS = 54
/** The bell rings when the carriage reaches this many columns before the right margin. */
export const BELL_OFFSET = 8
/** Column at which the margin bell rings. */
export const BELL_COL = RIGHT_MARGIN - BELL_OFFSET
/** Tab stops sit every this many columns. */
export const TAB_WIDTH = 5

/** Sheet size in millimetres (A4). */
export const PAGE_WIDTH_MM = 210
export const PAGE_HEIGHT_MM = 297
/** One character cell is 1/10 inch wide and 1/6 inch tall. */
export const CHAR_WIDTH_MM = 2.54
export const LINE_HEIGHT_MM = 25.4 / 6
/** Distance from the sheet edge to the first cell. */
export const MARGIN_LEFT_MM = (PAGE_WIDTH_MM - RIGHT_MARGIN * CHAR_WIDTH_MM) / 2
export const MARGIN_TOP_MM = (PAGE_HEIGHT_MM - PAGE_ROWS * LINE_HEIGHT_MM) / 2

export type Ribbon = 'black' | 'red'

/** One impact of a typebar on the paper. Strikes are never removed: overstrikes pile up. */
export interface Strike {
  readonly col: number
  readonly row: number
  readonly char: string
  readonly ribbon: Ribbon
  /** Deterministic seed for this impact's ink jitter. */
  readonly seed: number
}

export interface Page {
  readonly strikes: readonly Strike[]
}

export interface TypewriterDocument {
  readonly id: string
  readonly title: string
  readonly createdAt: number
  readonly updatedAt: number
  /** Document-wide seed; with `strikeCount` it makes every strike's seed unique and stable. */
  readonly seed: number
  /** Total strikes ever typed in this document, across all pages. */
  readonly strikeCount: number
  readonly pages: readonly Page[]
}

export function createDocument(id: string, seed: number, now: number, title = ''): TypewriterDocument {
  return { id, title, createdAt: now, updatedAt: now, seed, strikeCount: 0, pages: [{ strikes: [] }] }
}
