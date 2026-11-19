// Report on the animated parts of the source model: caps, levers, typebars, platen.
import { classifyKeys, endpoints, findNode, readSource, worldGeometry } from './parts.mjs'
import { boundsOf, islands } from './geometry.mjs'

const { doc } = await readSource()
const fmt = (v) => `(${v.map((n) => n.toFixed(2)).join(', ')})`

const keys = worldGeometry(findNode(doc, 'Teclas'))
const k = classifyKeys(keys.world, keys.indices)
console.log(`islands ${k.parts.length}: caps ${k.caps.length}, levers ${k.levers.length}, bars ${k.bars.length}, rest ${k.rest.length}`)

const capRows = [...k.caps].sort((a, b) => a.b.center[2] - b.b.center[2])
console.log('caps (z, y, x):')
for (const c of capRows) console.log('  ', fmt([c.b.center[2], c.b.center[1], c.b.center[0]]))

console.log('bars endpoints (lo, hi along long axis):')
for (const bar of [...k.bars].sort((a, b) => a.b.center[0] - b.b.center[0])) {
  const [lo, hi] = endpoints(keys.world, keys.indices, bar.tris, bar.b)
  console.log('  ', fmt(lo), '->', fmt(hi), 'size', fmt(bar.b.size))
}
console.log('rest (largest first):')
for (const r of [...k.rest].sort((a, b) => b.tris.length - a.tris.length).slice(0, 30)) {
  console.log('  tris', r.tris.length, 'center', fmt(r.b.center), 'size', fmt(r.b.size))
}
console.log('levers:')
for (const l of [...k.levers].sort((a, b) => a.b.center[0] - b.b.center[0]).slice(0, 8)) {
  console.log('  center', fmt(l.b.center), 'size', fmt(l.b.size), 'min', fmt(l.b.min), 'max', fmt(l.b.max))
}

const platen = worldGeometry(findNode(doc, 'Rodillo'))
for (const tris of islands(platen.world, platen.indices)) {
  const b = boundsOf(platen.world, platen.indices, tris)
  console.log('rodillo island', tris.length, 'center', fmt(b.center), 'size', fmt(b.size))
}
