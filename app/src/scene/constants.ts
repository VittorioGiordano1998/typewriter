/**
 * Scene geometry. One unit = 1 cm. The desk top is y = 0, the typist sits toward +z, and the
 * platen's front, where the typebars strike, is the origin of the x and z axes. The machine's own
 * measurements come from the model build (`modelLayout.json`, written by scripts/model/build.mjs).
 */
import { CHAR_WIDTH_MM, LINE_HEIGHT_MM, MARGIN_LEFT_MM, MARGIN_TOP_MM, PAGE_HEIGHT_MM, PAGE_WIDTH_MM } from '../core/page'
import layout from './modelLayout.json'

export const PLATEN_R = layout.platen.radius
export const PLATEN_LEN = layout.platen.length
/** The sheet floats this far in front of the platen, so the rubber never pokes through. */
export const PAPER_STANDOFF = 0.1

/** Where the typebars strike: the platen's front, on its horizontal midline. */
export const STRIKE = { x: 0, y: layout.platen.center[1], z: PAPER_STANDOFF } as const

export const CELL_W = CHAR_WIDTH_MM / 10
export const CELL_H = LINE_HEIGHT_MM / 10
export const PAPER_W = PAGE_WIDTH_MM / 10
export const PAPER_H = PAGE_HEIGHT_MM / 10
export const PAPER_MARGIN_L = MARGIN_LEFT_MM / 10
export const PAPER_MARGIN_T = MARGIN_TOP_MM / 10
/** The paper leans back from the platen by this angle (radians). */
export const PAPER_TILT = 0.1

/** Carriage-local x of the sheet's centre when the carriage is at column 0. */
export const PAPER_CENTER_X = -(PAPER_MARGIN_L + CELL_W / 2) + PAPER_W / 2
/** The paper vanishes below this world height: it wraps under the platen there. */
export const PAPER_CLIP_Y = STRIKE.y - 1.8

/** Where a typebar's slug lands: just in front of the paper at the strike point. */
export const PRINT_POINT = { x: 0, y: STRIKE.y - 0.15, z: PAPER_STANDOFF + 0.2 } as const

/** How far a key cap travels when pressed, cm. */
export const KEY_TRAVEL = 0.7
/** How far the space bar drops, cm. */
export const SPACE_TRAVEL = 0.45

/** Lamp geometry. */
export const LAMP_HEAD = { x: -24, y: 52, z: 12 } as const
