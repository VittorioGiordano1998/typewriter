import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import { makeWoodTexture } from './textures'

export function Desk() {
  const material = useMemo(
    () => new MeshStandardMaterial({ map: makeWoodTexture(), roughness: 0.62, metalness: 0 }),
    [],
  )
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} material={material} receiveShadow>
      <planeGeometry args={[420, 260]} />
    </mesh>
  )
}
