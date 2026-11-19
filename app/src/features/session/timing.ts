/**
 * Mechanical timings shared by the scene (animation) and the input controller (when the next
 * keystroke is accepted). One source, so what you see and what you can type never disagree.
 */

/** The carriage takes longer to slide back the further it has travelled. */
export function returnDurationMs(fromCol: number): number {
  return Math.round(140 + fromCol * 9)
}

/** Ejecting a full sheet and feeding the next one. */
export const PAGE_FEED_MS = 1100

/** How long the line-feed ratchet turns the platen by one line. */
export const LINE_FEED_MS = 220
