import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Mesh } from 'three'
import type { Session } from '../features/session/session'
import { STRIKE } from './constants'
import { ribbonBlack, ribbonRed } from './materials'
import { easeOut, type MachineRig } from './rig'

/** Width of the ribbon run in front of the platen, between the spool cups. */
const RIBBON_WIDTH = 17

/**
 * The inked ribbon across the printing point. The vibrator lifts it in front of the strike point
 * for an instant on every key, which is why a fresh letter appears a moment after the bar hits.
 */
export function Ribbon({ session, rig }: { session: Session; rig: MachineRig }) {
  const ref = useRef<Mesh>(null)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const t = rig.sinceRibbon
    const lift = t < 0.04 ? easeOut(t / 0.04) : t < 0.1 ? 1 : 1 - Math.min(1, (t - 0.1) / 0.12)
    m.position.y = STRIKE.y - 1.0 + 0.95 * Math.max(0, lift)
    m.material = session.getState().ribbon === 'red' ? ribbonRed : ribbonBlack
  })
  return (
    <mesh ref={ref} position={[0, STRIKE.y - 1.0, STRIKE.z + 0.45]} material={ribbonBlack} castShadow>
      <boxGeometry args={[RIBBON_WIDTH, 0.8, 0.03]} />
    </mesh>
  )
}
