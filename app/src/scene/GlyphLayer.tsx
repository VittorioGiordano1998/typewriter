import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useState } from 'react'
import {
  AddEquation,
  Color,
  CustomBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  OneFactor,
  OneMinusSrcColorFactor,
  PlaneGeometry,
  ShaderMaterial,
  ZeroFactor,
} from 'three'
import { inkFor, RIBBON_COLOR } from '../core/ink'
import type { Strike } from '../core/page'
import { PAPER_MARGIN_L, PAPER_MARGIN_T, CELL_H, CELL_W, PAPER_CLIP_Y } from './constants'
import type { Session } from '../features/session/session'
import type { MachineRig } from './rig'
import { ATLAS_COLS, ATLAS_ROWS, type GlyphAtlas } from './textures'

const VERT = /* glsl */ `
attribute vec2 iPos;
attribute vec2 iCell;
attribute vec4 iInk;
uniform vec2 uCellSize;
uniform vec2 uAtlas;
varying vec2 vUv;
varying float vDensity;
varying float vRibbon;
varying float vWorldY;
varying vec2 vPaper;
void main() {
  vec2 p = position.xy * uCellSize * iInk.y;
  float c = cos(iInk.x);
  float s = sin(iInk.x);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  vec2 local = iPos + p;
  vec2 q = position.xy + 0.5;
  vUv = vec2((iCell.x + q.x) / uAtlas.x, 1.0 - (iCell.y + (1.0 - q.y)) / uAtlas.y);
  vDensity = iInk.z;
  vRibbon = iInk.w;
  vPaper = local;
  vec4 wp = modelMatrix * vec4(local, 0.0, 1.0);
  vWorldY = wp.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

// The glyph absorbs light: the framebuffer is multiplied by (1 - cover * (1 - ink)). Ink therefore
// darkens whatever lighting the paper has, in light and in shadow, and overstrikes stack.
const FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uClipY;
uniform vec3 uInkBlack;
uniform vec3 uInkRed;
varying vec2 vUv;
varying float vDensity;
varying float vRibbon;
varying float vWorldY;
varying vec2 vPaper;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main() {
  if (vWorldY < uClipY) discard;
  float a = texture2D(uTex, vUv).a;
  float grain = vnoise(vPaper * 70.0) * 0.55 + vnoise(vPaper * 21.0) * 0.45;
  float cover = clamp(a * vDensity * (0.72 + 0.55 * grain), 0.0, 1.0);
  vec3 ink = vRibbon > 0.5 ? uInkRed : uInkBlack;
  gl_FragColor = vec4(cover * (1.0 - ink), 1.0);
}
`

const INITIAL_CAPACITY = 4096

/** Per-instance attributes of the glyph quads. The geometry object never changes; growth swaps attributes. */
class GlyphBuffers {
  readonly geometry = new InstancedBufferGeometry()
  private pos!: InstancedBufferAttribute
  private cell!: InstancedBufferAttribute
  private ink!: InstancedBufferAttribute
  private capacity = 0
  /** Which sheet the buffers currently hold, and how many strikes are written. */
  private docId = ''
  private page = -1
  private count = 0

  constructor() {
    const quad = new PlaneGeometry(1, 1)
    this.geometry.index = quad.index
    this.geometry.setAttribute('position', quad.getAttribute('position'))
    this.geometry.setAttribute('uv', quad.getAttribute('uv'))
    this.allocate(INITIAL_CAPACITY)
  }

  private allocate(capacity: number): void {
    this.capacity = capacity
    this.pos = new InstancedBufferAttribute(new Float32Array(capacity * 2), 2)
    this.cell = new InstancedBufferAttribute(new Float32Array(capacity * 2), 2)
    this.ink = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4)
    this.geometry.setAttribute('iPos', this.pos)
    this.geometry.setAttribute('iCell', this.cell)
    this.geometry.setAttribute('iInk', this.ink)
    this.geometry.instanceCount = 0
  }

  /** Brings the buffers in line with a sheet, writing only what is new when it is the same sheet. */
  sync(docId: string, page: number, strikes: readonly Strike[], atlas: GlyphAtlas): void {
    const same = this.docId === docId && this.page === page
    if (same && strikes.length === this.count) return
    const from = same && strikes.length >= this.count ? this.count : 0
    this.write(strikes, from, atlas)
    this.docId = docId
    this.page = page
    this.count = strikes.length
  }

  private write(strikes: readonly Strike[], from: number, atlas: GlyphAtlas): void {
    let start = from
    if (strikes.length > this.capacity) {
      this.allocate(Math.max(strikes.length * 2, this.capacity * 2))
      start = 0
    }
    for (let i = start; i < strikes.length; i++) {
      const s = strikes[i]
      const ink = inkFor(s.char, s.seed)
      const [cc, cr] = atlas.cellFor(s.char)
      this.pos.setXY(
        i,
        PAPER_MARGIN_L + (s.col + 0.5) * CELL_W + ink.dx * CELL_W,
        -(PAPER_MARGIN_T + (s.row + 0.5) * CELL_H) + ink.dy * CELL_W,
      )
      this.cell.setXY(i, cc, cr)
      this.ink.setXYZW(i, ink.rot, ink.scale, ink.density, s.ribbon === 'red' ? 1 : 0)
    }
    this.geometry.instanceCount = strikes.length
    this.pos.needsUpdate = true
    this.cell.needsUpdate = true
    this.ink.needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
  }
}

function hexToVec(hex: string): Color {
  return new Color(hex).convertLinearToSRGB()
}

interface Props {
  session: Session
  rig: MachineRig
  atlas: GlyphAtlas
}

/**
 * Every strike on the visible sheet as one instance of a glyph quad. The layer is append-only:
 * a new strike writes one instance; changing page or document rebuilds the buffers.
 */
export function GlyphLayer({ session, rig, atlas }: Props) {
  const [buffers] = useState(() => new GlyphBuffers())

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        blending: CustomBlending,
        blendEquation: AddEquation,
        blendSrc: ZeroFactor,
        blendDst: OneMinusSrcColorFactor,
        // Keep the framebuffer alpha as it is: zeroing it would let the page show through as a lighter box.
        blendSrcAlpha: ZeroFactor,
        blendDstAlpha: OneFactor,
        uniforms: {
          uTex: { value: atlas.texture },
          uCellSize: { value: [CELL_W, CELL_H] },
          uAtlas: { value: [ATLAS_COLS, ATLAS_ROWS] },
          uClipY: { value: PAPER_CLIP_Y },
          uInkBlack: { value: hexToVec(RIBBON_COLOR.black) },
          uInkRed: { value: hexToVec(RIBBON_COLOR.red) },
        },
      }),
    [atlas],
  )

  useEffect(
    () => () => {
      material.dispose()
      buffers.dispose()
    },
    [material, buffers],
  )

  useFrame(() => {
    const state = session.getState()
    const page = rig.displayPage
    const strikes = state.doc.pages[page]?.strikes ?? []
    buffers.sync(state.doc.id, page, strikes, atlas)
  })

  return (
    <mesh
      geometry={buffers.geometry}
      material={material}
      position={[0, 0, 0.004]}
      frustumCulled={false}
      renderOrder={2}
    />
  )
}
