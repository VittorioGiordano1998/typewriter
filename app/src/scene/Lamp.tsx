import { useEffect, useMemo, useRef } from 'react'
import { MeshBasicMaterial, Object3D, Quaternion, SpotLight, Vector3 } from 'three'
import { LAMP_HEAD, STRIKE } from './constants'
import { chrome, lampInside, lampMetal } from './materials'

const UP = new Vector3(0, 1, 0)

function Rod({ from, to, radius }: { from: Vector3; to: Vector3; radius: number }) {
  const { mid, quat, length } = useMemo(() => {
    const dir = to.clone().sub(from)
    return {
      mid: from.clone().add(to).multiplyScalar(0.5),
      quat: new Quaternion().setFromUnitVectors(UP, dir.clone().normalize()),
      length: dir.length(),
    }
  }, [from, to])
  return (
    <mesh position={mid} quaternion={quat} material={chrome} castShadow>
      <cylinderGeometry args={[radius, radius, length, 12]} />
    </mesh>
  )
}

const BASE = new Vector3(-36, 0.9, -16)
const ELBOW = new Vector3(-31, 30, -12)
const HEAD = new Vector3(LAMP_HEAD.x, LAMP_HEAD.y, LAMP_HEAD.z)
const AIM = new Vector3(STRIKE.x, STRIKE.y - 1, STRIKE.z + 1)

interface Props {
  /** 0..1 */
  intensity: number
  /** Shadow map size in pixels; 0 for no shadows. */
  shadowMap: number
}

/** The desk lamp and the spotlight that frames the strike point. */
export function Lamp({ intensity, shadowMap }: Props) {
  const light = useRef<SpotLight>(null)
  const target = useMemo(() => {
    const t = new Object3D()
    t.position.copy(AIM)
    return t
  }, [])
  const axis = useMemo(() => AIM.clone().sub(HEAD).normalize(), [])
  const shadeQuat = useMemo(() => new Quaternion().setFromUnitVectors(UP, axis.clone().negate()), [axis])
  const bulb = useMemo(() => new MeshBasicMaterial({ color: '#fff1cf' }), [])
  const k = Math.max(0, Math.min(1, intensity))

  // A new shadow map size needs a new map: drop the old one so the renderer allocates it again.
  useEffect(() => {
    const l = light.current
    if (!l || shadowMap === 0) return
    l.shadow.mapSize.set(shadowMap, shadowMap)
    l.shadow.map?.dispose()
    l.shadow.map = null
  }, [shadowMap])

  return (
    <group>
      <mesh position={BASE} material={lampMetal} castShadow receiveShadow>
        <cylinderGeometry args={[6, 6.8, 1.8, 40]} />
      </mesh>
      <Rod from={BASE} to={ELBOW} radius={0.5} />
      <Rod from={ELBOW} to={HEAD} radius={0.45} />
      <mesh position={ELBOW} material={chrome}>
        <sphereGeometry args={[0.95, 16, 12]} />
      </mesh>
      {/* Shade: a cone whose open end faces the paper. */}
      <group position={HEAD} quaternion={shadeQuat}>
        <mesh material={lampMetal} castShadow>
          <cylinderGeometry args={[2.2, 6.5, 9, 40, 1, true]} />
        </mesh>
        <mesh material={lampInside} scale={0.98}>
          <cylinderGeometry args={[2.2, 6.5, 9, 40, 1, true]} />
        </mesh>
        <mesh position={[0, -3.2, 0]} material={bulb}>
          <sphereGeometry args={[1.7, 20, 14]} />
        </mesh>
      </group>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={[HEAD.x + axis.x * 3, HEAD.y + axis.y * 3, HEAD.z + axis.z * 3]}
        target={target}
        color="#ffe6b8"
        intensity={16000 * k}
        angle={0.36}
        penumbra={0.95}
        decay={2}
        distance={0}
        castShadow={shadowMap > 0}
        shadow-mapSize={[Math.max(shadowMap, 256), Math.max(shadowMap, 256)]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={12}
        shadow-camera-far={90}
      />
    </group>
  )
}
