import { MathUtils } from 'three'

/**
 * The close-up always shows at least this much width of the desk, in cm. A wide screen shows a
 * generous 23 cm; a phone held upright shows about 9 cm, so the typed line stays legible.
 */
export function minViewWidth(aspect: number): number {
  const t = MathUtils.clamp((aspect - 0.5) / 0.7, 0, 1)
  return MathUtils.lerp(9, 23, t)
}
