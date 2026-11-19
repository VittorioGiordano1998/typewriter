// Reads the source model and classifies its pieces into the parts the scene animates.
// Shared by analyze-parts (prints a report) and build (writes the optimised model).
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { boundsOf, islands, transformPoint, unionBounds } from './geometry.mjs'

export const SOURCE = 'assets-src/victorian-typewriter.glb'
/** The source is in metres; the scene is in centimetres. */
export const SCALE = 100

export async function readSource() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  const doc = await io.read(SOURCE)
  return { io, doc }
}

/** World-space (cm) positions and indices of a node's first primitive. */
export function worldGeometry(node) {
  const prim = node.getMesh().listPrimitives()[0]
  const m = node.getWorldMatrix()
  const pos = prim.getAttribute('POSITION').getArray()
  const world = new Float32Array(pos.length)
  for (let i = 0; i < pos.length; i += 3) {
    const p = transformPoint(m, pos[i], pos[i + 1], pos[i + 2])
    world[i] = p[0] * SCALE
    world[i + 1] = p[1] * SCALE
    world[i + 2] = p[2] * SCALE
  }
  return { prim, world, indices: prim.getIndices().getArray() }
}

/** The two vertices farthest apart along the island's longest box axis. */
export function endpoints(world, indices, tris, b) {
  const axis = b.size.indexOf(Math.max(...b.size))
  let lo = null
  let hi = null
  for (const t of tris) {
    for (let k = 0; k < 3; k++) {
      const v = indices[t * 3 + k]
      const p = [world[v * 3], world[v * 3 + 1], world[v * 3 + 2]]
      if (!lo || p[axis] < lo[axis]) lo = p
      if (!hi || p[axis] > hi[axis]) hi = p
    }
  }
  return [lo, hi]
}

export function findNode(doc, part) {
  const node = doc.getRoot().listNodes().find((n) => n.getMesh() && n.getName().includes(part))
  if (!node) throw new Error(`No mesh node matching ${part}`)
  return node
}

/**
 * Splits the keys mesh into caps, key levers, typebars and the small links. Caps are the 2 cm
 * discs; levers are long thin pieces running back from a cap; typebars are the ~5.4 cm pieces in
 * the basket; anything else stays with the static body.
 */
export function classifyKeys(world, indices) {
  const parts = islands(world, indices).map((tris) => ({ tris, b: boundsOf(world, indices, tris) }))
  const caps = []
  const levers = []
  const bars = []
  const rest = []
  for (const p of parts) {
    const s = [...p.b.size].sort((a, b) => a - b)
    if (Math.abs(p.b.size[0] - 2) < 0.3 && Math.abs(p.b.size[2] - 2) < 0.3 && p.b.size[1] < 1) caps.push(p)
    else if (s[2] > 12 && s[0] < 0.4 && p.b.size[2] === s[2]) levers.push(p)
    else if (s[2] > 4.8 && s[2] < 6.2 && s[1] < 1.2) bars.push(p)
    else rest.push(p)
  }
  return { parts, caps, levers, bars, rest, unionBounds }
}
