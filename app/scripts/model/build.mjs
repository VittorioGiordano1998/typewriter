// Builds public/models/typewriter.glb and src/scene/modelLayout.json from the source model.
//
// The source ("Victorian typewriter" by tijerin_art, CC BY 4.0, see docs/legal/ASSETS.md) has its
// parts merged by material. This splits out what the scene animates, bakes everything into scene
// space (centimetres; desk at y = 0; x = 0 at the platen's centre; z = 0 at the platen's front),
// and compresses the result.
//
// Usage: node scripts/model/build.mjs
import fs from 'node:fs'
import { dedup, meshopt, prune, textureCompress } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'
import { boundsOf, islands, unionBounds } from './geometry.mjs'
import { classifyKeys, endpoints, readSource, SCALE } from './parts.mjs'

const OUT_MODEL = 'public/models/typewriter.glb'
const OUT_LAYOUT = 'src/scene/modelLayout.json'

const { io, doc } = await readSource()
const root = doc.getRoot()
const buffer = root.listBuffers()[0]

/** Every source mesh node, with its world matrix (metres). */
const sources = root.listNodes().filter((n) => n.getMesh())

// ---- 1. Scene-space geometry of every source primitive ------------------------------------

/** Reads a primitive into plain float arrays, transformed to scene centimetres (before re-centring). */
function readPrimitive(node) {
  const prim = node.getMesh().listPrimitives()[0]
  const m = node.getWorldMatrix()
  const attrs = {}
  for (const semantic of prim.listSemantics()) {
    const acc = prim.getAttribute(semantic)
    const n = acc.getElementSize()
    const out = new Float32Array(acc.getCount() * n)
    const el = []
    for (let i = 0; i < acc.getCount(); i++) {
      acc.getElement(i, el)
      for (let a = 0; a < n; a++) out[i * n + a] = el[a]
    }
    attrs[semantic] = { type: acc.getType(), size: n, array: out }
  }
  const tf = (x, y, z, w) => [
    m[0] * x + m[4] * y + m[8] * z + m[12] * w,
    m[1] * x + m[5] * y + m[9] * z + m[13] * w,
    m[2] * x + m[6] * y + m[10] * z + m[14] * w,
  ]
  const pos = attrs.POSITION.array
  for (let i = 0; i < pos.length; i += 3) {
    const p = tf(pos[i], pos[i + 1], pos[i + 2], 1)
    pos[i] = p[0] * SCALE
    pos[i + 1] = p[1] * SCALE
    pos[i + 2] = p[2] * SCALE
  }
  for (const semantic of ['NORMAL', 'TANGENT']) {
    const a = attrs[semantic]
    if (!a) continue
    for (let i = 0; i < a.array.length; i += a.size) {
      const d = tf(a.array[i], a.array[i + 1], a.array[i + 2], 0)
      const len = Math.hypot(d[0], d[1], d[2]) || 1
      a.array[i] = d[0] / len
      a.array[i + 1] = d[1] / len
      a.array[i + 2] = d[2] / len
    }
  }
  const idxAcc = prim.getIndices()
  const indices = new Uint32Array(idxAcc.getCount())
  for (let i = 0; i < indices.length; i++) indices[i] = idxAcc.getScalar(i)
  return { name: node.getName(), material: prim.getMaterial(), attrs, indices }
}

const geo = Object.fromEntries(sources.map((n) => [n.getName(), readPrimitive(n)]))
const byPart = (part) => {
  const key = Object.keys(geo).find((k) => k.includes(part))
  if (!key) throw new Error(`No source mesh for ${part}`)
  return geo[key]
}

// ---- 2. Classify the pieces ----------------------------------------------------------------

const keysSrc = byPart('Teclas')
const keys = classifyKeys(keysSrc.attrs.POSITION.array, keysSrc.indices)
const platenSrc = byPart('Rodillo')
const platenIslands = islands(platenSrc.attrs.POSITION.array, platenSrc.indices).map((tris) => ({
  tris,
  b: boundsOf(platenSrc.attrs.POSITION.array, platenSrc.indices, tris),
}))
// The platen is the long round piece: as tall as it is deep.
const platenPiece = platenIslands.find((p) => p.b.size[0] > 25 && Math.abs(p.b.size[1] - p.b.size[2]) < 0.3)
if (!platenPiece) throw new Error('Platen not found')
const PLATEN_R = (platenPiece.b.size[1] + platenPiece.b.size[2]) / 4
const platenAxis = platenPiece.b.center

let deskY = Infinity
for (const g of Object.values(geo)) {
  const p = g.attrs.POSITION.array
  for (let i = 1; i < p.length; i += 3) deskY = Math.min(deskY, p[i])
}
/** Scene origin in source centimetres. */
const ORIGIN = [platenAxis[0], deskY, platenAxis[2] + PLATEN_R]
const toScene = (p) => [p[0] - ORIGIN[0], p[1] - ORIGIN[1], p[2] - ORIGIN[2]]
console.log('platen radius', PLATEN_R.toFixed(3), 'length', platenPiece.b.size[0].toFixed(2), 'origin', ORIGIN.map((v) => v.toFixed(2)))

// ---- 3. Primitive builders -----------------------------------------------------------------

/** A new primitive from some triangles of a source, in scene space, minus `pivot`. */
function makePrimitive(src, tris, pivot = [0, 0, 0]) {
  const remap = new Map()
  const order = []
  const idx = []
  for (const t of tris) {
    for (let k = 0; k < 3; k++) {
      const v = src.indices[t * 3 + k]
      if (!remap.has(v)) {
        remap.set(v, order.length)
        order.push(v)
      }
      idx.push(remap.get(v))
    }
  }
  const prim = doc.createPrimitive().setMaterial(src.material)
  for (const [semantic, a] of Object.entries(src.attrs)) {
    const out = new Float32Array(order.length * a.size)
    order.forEach((v, i) => {
      for (let c = 0; c < a.size; c++) out[i * a.size + c] = a.array[v * a.size + c]
    })
    if (semantic === 'POSITION') {
      for (let i = 0; i < out.length; i += 3) {
        const p = toScene([out[i], out[i + 1], out[i + 2]])
        out[i] = p[0] - pivot[0]
        out[i + 1] = p[1] - pivot[1]
        out[i + 2] = p[2] - pivot[2]
      }
    }
    prim.setAttribute(semantic, doc.createAccessor().setType(a.type).setArray(out).setBuffer(buffer))
  }
  prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buffer))
  return prim
}

const allTris = (src) => Array.from({ length: src.indices.length / 3 }, (_, i) => i)

/**
 * An empty node at the pivot holding the mesh in a child. The scene rotates the pivot node;
 * mesh compression may rewrite the child's transform, but never the pivot's.
 */
function pivotNode(name, pivot, mesh) {
  return doc.createNode(name).setTranslation(pivot).addChild(doc.createNode(`${name}_mesh`).setMesh(mesh))
}
const meshOf = (name, prims) => {
  const mesh = doc.createMesh(name)
  for (const p of prims) mesh.addPrimitive(p)
  return mesh
}

// ---- 4. Static body, carriage and platen ---------------------------------------------------

const staticPrims = []
const carriagePrims = []
const lineY = platenAxis[1]
const atPrintingHeight = (b) => b.max[1] > lineY - 1 && b.min[1] < lineY + 2.2

// Body: the frame, the basket and the small static leg piece.
staticPrims.push(makePrimitive(byPart('maquina_Base'), allTris(byPart('maquina_Base'))))
staticPrims.push(makePrimitive(byPart('polySurface109'), allTris(byPart('polySurface109'))))

// Platen material pieces: the platen turns; the paper table and the carriage frame slide; the small
// type-guide plate in front of the printing point stays put.
for (const p of platenIslands) {
  if (p === platenPiece) continue
  if (p.b.size[0] < 6) staticPrims.push(makePrimitive(platenSrc, p.tris))
  else carriagePrims.push(makePrimitive(platenSrc, p.tris))
}

// The carriage-end meshes also contain the four central guide fingers. Omit those fingers:
// they move with the paper and cover the same characters even after a line feed.
const isCentralGuide = (b) =>
  b.min[0] > ORIGIN[0] - 2 && b.max[0] < ORIGIN[0] + 2 &&
  b.min[2] > ORIGIN[2] - 0.5 && b.max[2] < ORIGIN[2] + 0.7 &&
  atPrintingHeight(b)
for (const part of ['polySurface104', 'polySurface103']) {
  const src = byPart(part)
  const hardware = islands(src.attrs.POSITION.array, src.indices)
    .filter((tris) => !isCentralGuide(boundsOf(src.attrs.POSITION.array, src.indices, tris)))
  carriagePrims.push(makePrimitive(src, hardware.flat()))
}

// Rods: the long rails at the back are fixed to the frame; the rest belongs to the carriage.
const rods = byPart('Reglas')
const rodPieces = islands(rods.attrs.POSITION.array, rods.indices).map((tris) => ({
  tris,
  b: boundsOf(rods.attrs.POSITION.array, rods.indices, tris),
}))
const isRail = (p) => p.b.size[0] > 32 && p.b.center[2] < ORIGIN[2] - 7
/**
 * The card holder, the type guide and the thin line strip sit right on the paper at the printing
 * line: on the real machine you read a line once it has rolled up, but here they would hide the
 * line being typed from every camera angle, so they are left out.
 */
const coversLine = (p) => {
  const z = p.b.center[2] - ORIGIN[2]
  return z > -0.5 && z < 3.2 && atPrintingHeight(p.b)
}
const rails = rodPieces.filter(isRail)
const carriageRods = rodPieces.filter((p) => !isRail(p) && !coversLine(p))
console.log('left out', rodPieces.filter(coversLine).length, 'pieces covering the printing line')
if (rails.length) staticPrims.push(makePrimitive(rods, rails.flatMap((p) => p.tris)))
carriagePrims.push(makePrimitive(rods, carriageRods.flatMap((p) => p.tris)))

const platenPivot = toScene(platenAxis)
const platenNode = pivotNode('platen', platenPivot, meshOf('platen', [makePrimitive(platenSrc, platenPiece.tris, platenPivot)]))

// ---- 5. Keys: a cap with its lever, turning about the lever's back end ---------------------

const P = keysSrc.attrs.POSITION.array
const I = keysSrc.indices
const usedLevers = new Set()
const capInfo = keys.caps.map((cap) => {
  // The lever under this cap: x within the cap, front end just behind the cap.
  const lever = keys.levers
    .filter((l) => !usedLevers.has(l) && Math.abs(l.b.center[0] - cap.b.center[0]) < 0.6 && l.b.max[2] > cap.b.center[2] - 1.5 && l.b.max[2] < cap.b.center[2] + 1.5)
    .sort((a, b) => Math.abs(a.b.max[2] - cap.b.center[2]) - Math.abs(b.b.max[2] - cap.b.center[2]))[0]
  if (lever) usedLevers.add(lever)
  const pivotSrc = lever ? endpoints(P, I, lever.tris, lever.b)[0] : [cap.b.center[0], cap.b.center[1] - 2, cap.b.center[2] - 18]
  return { cap, lever, pivot: toScene(pivotSrc), center: toScene(cap.b.center) }
})

// Rows from the back (0) to the front (3), each sorted left to right.
const rowZs = [...new Set(capInfo.map((c) => c.center[2].toFixed(1)))].map(Number).sort((a, b) => a - b)
const rows = rowZs.map((z) =>
  capInfo.filter((c) => Math.abs(c.center[2] - z) < 0.3).sort((a, b) => a.center[0] - b.center[0]),
)
const keysParent = doc.createNode('keys')
const keyLayout = []
rows.forEach((row, r) =>
  row.forEach((k, c) => {
    const name = `key_${r}_${String(c).padStart(2, '0')}`
    const tris = [...k.cap.tris, ...(k.lever ? k.lever.tris : [])]
    keysParent.addChild(pivotNode(name, k.pivot, meshOf(name, [makePrimitive(keysSrc, tris, k.pivot)])))
    keyLayout.push({ name, row: r, col: c, pivot: k.pivot, cap: k.center, arm: Math.hypot(k.center[1] - k.pivot[1], k.center[2] - k.pivot[2]) })
  }),
)

// Space bar: the long piece at the front; it drops straight down.
const rest = []
let spaceInfo = null
for (const p of keys.rest) {
  if (p.b.size[0] > 15 && p.b.size[1] < 1.5) {
    const pivot = toScene(p.b.center)
    keysParent.addChild(pivotNode('spacebar', pivot, meshOf('spacebar', [makePrimitive(keysSrc, p.tris, pivot)])))
    spaceInfo = { name: 'spacebar', center: pivot }
  } else rest.push(p)
}
// Levers without a cap (shift keys and the space bar's arms) stay with the body.
for (const l of keys.levers) if (!usedLevers.has(l)) rest.push(l)
staticPrims.push(makePrimitive(keysSrc, rest.flatMap((p) => p.tris)))

// ---- 6. Typebars: each turns about its back end ---------------------------------------------

const barsParent = doc.createNode('typebars')
const barLayout = []
;[...keys.bars]
  .sort((a, b) => a.b.center[0] - b.b.center[0])
  .forEach((bar, i) => {
    const [lo, hi] = endpoints(P, I, bar.tris, bar.b)
    const pivot = toScene(lo)
    const tip = toScene(hi)
    const name = `bar_${String(i).padStart(2, '0')}`
    barsParent.addChild(pivotNode(name, pivot, meshOf(name, [makePrimitive(keysSrc, bar.tris, pivot)])))
    barLayout.push({ name, pivot, tip, length: Math.hypot(tip[0] - pivot[0], tip[1] - pivot[1], tip[2] - pivot[2]) })
  })

// ---- 7. Assemble the new scene and drop the old one -----------------------------------------

const carriage = doc.createNode('carriage').setMesh(meshOf('carriage', carriagePrims)).addChild(platenNode)
const body = doc.createNode('body').setMesh(meshOf('body', staticPrims))
const top = doc.createNode('typewriter').addChild(body).addChild(carriage).addChild(keysParent).addChild(barsParent)
for (const s of root.listScenes()) s.dispose()
for (const n of sources) n.dispose()
doc.createScene('typewriter').addChild(top)

await doc.transform(
  prune(),
  dedup(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
)
await MeshoptEncoder.ready
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))

fs.mkdirSync('public/models', { recursive: true })
await io.registerDependencies({ 'meshopt.encoder': MeshoptEncoder }).write(OUT_MODEL, doc)

const all = unionBounds(Object.values(geo).map((g) => boundsOf(g.attrs.POSITION.array, g.indices, allTris(g))))
const layout = {
  source: 'Victorian typewriter by tijerin_art (Sketchfab cbfcb0e1d8c74f02bde4cfa7b92115f9), CC BY 4.0',
  generatedBy: 'scripts/model/build.mjs',
  platen: { radius: PLATEN_R, length: platenPiece.b.size[0], center: platenPivot },
  bounds: { min: toScene(all.min), max: toScene(all.max) },
  keys: keyLayout,
  rows: rows.map((r) => r.length),
  spacebar: spaceInfo,
  bars: barLayout,
}
fs.writeFileSync(OUT_LAYOUT, JSON.stringify(layout, (_, v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v), 1) + '\n')
const size = fs.statSync(OUT_MODEL).size
console.log(`wrote ${OUT_MODEL} (${(size / 1024).toFixed(0)} KB), ${keyLayout.length} keys, ${barLayout.length} bars, rows ${layout.rows.join('/')}`)
