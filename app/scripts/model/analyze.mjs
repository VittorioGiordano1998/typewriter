// Prints, for each mesh of the source model, its islands in centimetres (scene axes).
// Usage: node scripts/model/analyze.mjs [meshNameFilter]
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { boundsOf, islands, transformPoint } from './geometry.mjs'

const filter = process.argv[2] ?? ''
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const doc = await io.read('assets-src/victorian-typewriter.glb')
const fmt = (v) => v.map((n) => n.toFixed(1)).join(',')

for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh()
  if (!mesh || !node.getName().includes(filter)) continue
  const m = node.getWorldMatrix()
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION').getArray()
    const world = new Float32Array(pos.length)
    for (let i = 0; i < pos.length; i += 3) {
      const p = transformPoint(m, pos[i], pos[i + 1], pos[i + 2])
      // metres to centimetres
      world[i] = p[0] * 100
      world[i + 1] = p[1] * 100
      world[i + 2] = p[2] * 100
    }
    const idx = prim.getIndices().getArray()
    const parts = islands(world, idx).map((tris) => ({ tris, b: boundsOf(world, idx, tris) }))
    parts.sort((a, b) => b.tris.length - a.tris.length)
    console.log(`== ${node.getName()} (${parts.length} islands, ${idx.length / 3} tris)`)
    for (const p of parts.slice(0, Number(process.argv[3] ?? 40))) {
      console.log(`  tris=${String(p.tris.length).padStart(5)} center=[${fmt(p.b.center)}] size=[${fmt(p.b.size)}]`)
    }
  }
}
