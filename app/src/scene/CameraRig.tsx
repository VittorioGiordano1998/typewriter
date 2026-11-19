import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import { MathUtils, Vector3 } from 'three'
import { STRIKE } from './constants'
import { minViewWidth } from './framing'
import type { ViewControl } from './viewControl'

/** Where the camera sits at each end of the zoom range. `dist` is the distance to `target`. */
// Look down over the front rail so it clears the active line throughout the zoom range.
const NEAR = { target: new Vector3(0, STRIKE.y + 1.2, 0), elevation: 35, dist: 26 }
const FAR = { target: new Vector3(-7, STRIKE.y - 4, 5), elevation: 39, dist: 100 }
interface Props {
  view: ViewControl
  reducedMotion: boolean
}

/** Dollies between a close-up of the strike point and a view of the whole machine. */
export function CameraRig({ view, reducedMotion }: Props) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const smooth = useRef(view.zoom)
  const target = useRef(new Vector3())
  const eye = useRef(new Vector3())

  useFrame((_, dt) => {
    smooth.current += (view.zoom - smooth.current) * (1 - Math.exp(-dt * (reducedMotion ? 60 : 6)))
    const t = MathUtils.smoothstep(smooth.current, 0, 1)
    const aspect = size.width / Math.max(1, size.height)
    const fov = 'fov' in camera ? (camera as { fov: number }).fov : 32
    const halfTan = Math.tan(MathUtils.degToRad(fov) / 2)
    const nearDist = Math.max(NEAR.dist, minViewWidth(aspect) / (2 * halfTan * aspect))

    target.current.lerpVectors(NEAR.target, FAR.target, t)
    const elev = MathUtils.degToRad(MathUtils.lerp(NEAR.elevation, FAR.elevation, t))
    const dist = MathUtils.lerp(nearDist, Math.max(FAR.dist, nearDist * 2.4), t)
    eye.current.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist).add(target.current)
    camera.position.copy(eye.current)
    camera.lookAt(target.current)
  })

  return null
}
