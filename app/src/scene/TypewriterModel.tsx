import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import { Mesh, Quaternion, Vector3, type MeshStandardMaterial, type Object3D } from 'three'
import { KEY_TRAVEL, PAPER_CENTER_X, PRINT_POINT, SPACE_TRAVEL } from './constants'
import { KEYS, SPACE_INDEX } from './keyboardLayout'
import layout from './modelLayout.json'
import { barTravel, keyTravel, PLATEN_PER_LINE, type MachineRig } from './rig'

/** The optimised model (scripts/model/build.mjs). Mesh compression decodes locally: nothing from a CDN. */
export const MODEL_URL = `${import.meta.env.BASE_URL}models/typewriter.glb`

interface BarRig {
  node: Object3D
  /** Rotation that points the bar at the printing point. */
  strike: Quaternion
  /** How much longer the bar must reach to touch the platen. */
  stretch: number
}

const IDENTITY = new Quaternion()

/**
 * Drives the model's moving parts from the rig: carriage and platen follow the cursor, each key
 * turns about its lever's pivot, the space bar drops, and each typebar flies to the printing point.
 */
class ModelAnimator {
  private readonly carriage: Object3D | null
  private readonly platen: Object3D | null
  private readonly keys: (Object3D | null)[]
  private readonly space: Object3D | null
  private readonly spaceRestY: number
  private readonly bars: (BarRig | null)[]

  constructor(root: Object3D) {
    // Shadows on every part; reflections of the room kept subtle, the lamp is the star.
    root.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true
        o.receiveShadow = true
        const m = o.material as MeshStandardMaterial
        if ('envMapIntensity' in m) m.envMapIntensity = 0.8
      }
    })
    const find = (name: string) => root.getObjectByName(name) ?? null
    this.carriage = find('carriage')
    this.platen = find('platen')
    this.keys = KEYS.map((k) => find(k.node))
    this.space = find('spacebar')
    this.spaceRestY = this.space?.position.y ?? 0
    const target = new Vector3(PRINT_POINT.x, PRINT_POINT.y, PRINT_POINT.z)
    this.bars = layout.bars.map((b) => {
      const node = find(b.name)
      if (!node) return null
      const pivot = new Vector3(...b.pivot)
      const rest = new Vector3(...b.tip).sub(pivot).normalize()
      const toPrint = target.clone().sub(pivot)
      return {
        node,
        strike: new Quaternion().setFromUnitVectors(rest, toPrint.clone().normalize()),
        stretch: Math.max(1, toPrint.length() / b.length),
      }
    })
  }

  update(rig: MachineRig): void {
    // The model was built with the platen centred on the strike point; the sheet's centre sits
    // PAPER_CENTER_X to the right of it when the carriage is at column 0.
    if (this.carriage) this.carriage.position.x = rig.carriageX + PAPER_CENTER_X
    if (this.platen) this.platen.rotation.x = -rig.rowAnim * PLATEN_PER_LINE

    for (let i = 0; i < this.keys.length; i++) {
      const node = this.keys[i]
      if (node) node.rotation.x = (KEY_TRAVEL / KEYS[i].arm) * keyTravel(rig.sinceStrike[i])
    }
    if (this.space) this.space.position.y = this.spaceRestY - SPACE_TRAVEL * keyTravel(rig.sinceStrike[SPACE_INDEX])

    for (let i = 0; i < this.bars.length; i++) {
      const bar = this.bars[i]
      if (!bar) continue
      const t = barTravel(rig.sinceBar[i])
      bar.node.quaternion.slerpQuaternions(IDENTITY, bar.strike, t)
      bar.node.scale.z = 1 + (bar.stretch - 1) * t
    }
  }
}

/** The typewriter model, animated by the rig. */
export function TypewriterModel({ rig }: { rig: MachineRig }) {
  const { scene } = useGLTF(MODEL_URL, false, true)
  const animator = useMemo(() => new ModelAnimator(scene), [scene])
  useFrame(() => animator.update(rig))
  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL, false, true)
