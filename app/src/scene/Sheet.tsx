import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { MeshStandardMaterial, Plane, Vector3, type Group } from 'three'
import type { Session } from '../features/session/session'
import { GlyphLayer } from './GlyphLayer'
import {
  CELL_H,
  CELL_W,
  PAPER_CLIP_Y,
  PAPER_H,
  PAPER_MARGIN_L,
  PAPER_MARGIN_T,
  PAPER_STANDOFF,
  PAPER_TILT,
  PAPER_W,
  STRIKE,
} from './constants'
import type { MachineRig } from './rig'
import { makePaperTexture, type GlyphAtlas } from './textures'

const clipPlane = new Plane(new Vector3(0, 1, 0), -PAPER_CLIP_Y)

interface Props {
  session: Session
  rig: MachineRig
  atlas: GlyphAtlas
}

/**
 * The sheet in the machine and the letters on it. It rides with the carriage and rises with the
 * platen; below the strike line it disappears under the platen.
 */
export function Sheet({ session, rig, atlas }: Props) {
  const carriage = useRef<Group>(null)
  const scroll = useRef<Group>(null)
  const paper = useMemo(() => {
    const { map, bump } = makePaperTexture()
    map.repeat.set(2, 2.8)
    return new MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.35,
      roughness: 0.93,
      metalness: 0,
      clippingPlanes: [clipPlane],
    })
  }, [])

  useFrame(() => {
    if (carriage.current) carriage.current.position.x = rig.carriageX
    if (scroll.current) {
      scroll.current.position.y = PAPER_MARGIN_T + (rig.rowAnim + 0.5) * CELL_H + rig.feedOffset
    }
  })

  return (
    <group ref={carriage}>
      {/* Tilted back; paper-local origin is the sheet's top-left corner, y pointing up. */}
      <group position={[0, STRIKE.y, PAPER_STANDOFF]} rotation-x={-PAPER_TILT}>
        <group ref={scroll} position={[-(PAPER_MARGIN_L + CELL_W / 2), 0, 0]}>
          <mesh position={[PAPER_W / 2, -PAPER_H / 2, 0]} material={paper} receiveShadow>
            <planeGeometry args={[PAPER_W, PAPER_H]} />
          </mesh>
          <GlyphLayer session={session} rig={rig} atlas={atlas} />
        </group>
      </group>
    </group>
  )
}
