// Geometry helpers for the model pipeline: world-space positions and connected pieces ("islands").

/** Applies a column-major 4x4 matrix to a point. */
export function transformPoint(m, x, y, z) {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ]
}

/**
 * Splits a triangle list into connected pieces. Vertices at the same position count as joined,
 * so UV seams do not break a part in two. Returns, for each island, its triangle indices.
 */
export function islands(positions, indices) {
  const vertexCount = positions.length / 3
  const parent = new Int32Array(vertexCount).map((_, i) => i)
  const find = (a) => {
    while (parent[a] !== a) {
      parent[a] = parent[parent[a]]
      a = parent[a]
    }
    return a
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[ra] = rb
  }
  // Weld by position (rounded to 1e-5 of the unit).
  const byPos = new Map()
  for (let v = 0; v < vertexCount; v++) {
    const key = `${Math.round(positions[v * 3] * 1e5)},${Math.round(positions[v * 3 + 1] * 1e5)},${Math.round(positions[v * 3 + 2] * 1e5)}`
    const prev = byPos.get(key)
    if (prev === undefined) byPos.set(key, v)
    else union(v, prev)
  }
  for (let t = 0; t < indices.length; t += 3) {
    union(indices[t], indices[t + 1])
    union(indices[t + 1], indices[t + 2])
  }
  const groups = new Map()
  for (let t = 0; t < indices.length; t += 3) {
    const root = find(indices[t])
    let g = groups.get(root)
    if (!g) groups.set(root, (g = []))
    g.push(t / 3)
  }
  return [...groups.values()]
}

/** Bounding box of the vertices used by some triangles. */
export function boundsOf(positions, indices, triangles) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const t of triangles) {
    for (let k = 0; k < 3; k++) {
      const v = indices[t * 3 + k]
      for (let a = 0; a < 3; a++) {
        const c = positions[v * 3 + a]
        if (c < min[a]) min[a] = c
        if (c > max[a]) max[a] = c
      }
    }
  }
  return { min, max, center: min.map((m, a) => (m + max[a]) / 2), size: min.map((m, a) => max[a] - m) }
}

/** Merges boxes. */
export function unionBounds(boxes) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const b of boxes) {
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], b.min[a])
      max[a] = Math.max(max[a], b.max[a])
    }
  }
  return { min, max, center: min.map((m, a) => (m + max[a]) / 2), size: min.map((m, a) => max[a] - m) }
}
