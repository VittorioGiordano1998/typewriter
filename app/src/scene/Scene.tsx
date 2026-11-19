import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import { ACESFilmicToneMapping, Color, PCFSoftShadowMap } from 'three'
import type { Session } from '../features/session/session'
import { CameraRig } from './CameraRig'
import { Desk } from './Desk'
import { Lamp } from './Lamp'
import { Ribbon } from './Ribbon'
import { Sheet } from './Sheet'
import { TypewriterModel } from './TypewriterModel'
import { MachineRig } from './rig'
import { detectDevice, initialQuality, QUALITY, stepQuality, type Quality } from './quality'
import { createGlyphAtlas } from './textures'
import type { ViewControl } from './viewControl'

interface Props {
  session: Session
  view: ViewControl
  /** Lamp intensity, 0..1. */
  lamp: number
  night: boolean
  reducedMotion: boolean
}

/** Dev only: `window.__timeScale = 0.05` slows the machine down, to inspect a strike frame by frame. */
function timeScale(): number {
  if (!import.meta.env.DEV) return 1
  const v = (window as unknown as { __timeScale?: number }).__timeScale
  return typeof v === 'number' && v > 0 ? v : 1
}

function RigDriver({ rig }: { rig: MachineRig }) {
  useFrame((_, dt) => rig.update(dt * timeScale()), -1)
  return null
}

/** The 3D world: desk, machine, lamp. Lazy-loaded; all geometry and textures are procedural. */
export default function Scene({ session, view, lamp, night, reducedMotion }: Props) {
  const rig = useMemo(() => new MachineRig(session), [session])
  useEffect(() => rig.attach(), [rig])
  useEffect(() => rig.setReducedMotion(reducedMotion), [rig, reducedMotion])
  const [quality, setQuality] = useState<Quality>(() => initialQuality(detectDevice()))
  const profile = QUALITY[quality]
  const atlas = useMemo(() => createGlyphAtlas(), [])
  const background = useMemo(() => new Color(night ? '#050403' : '#0d0a08'), [night])

  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      dpr={[profile.dpr[0], profile.dpr[1]]}
      camera={{ fov: 32, near: 1, far: 600, position: [0, 40, 50] }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, preserveDrawingBuffer: false }}
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true
      }}
    >
      <color attach="background" args={[background]} />
      <fog attach="fog" args={[background, 140, 330]} />
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setQuality((q) => stepQuality(q, 'down'))}
        onIncline={() => setQuality((q) => stepQuality(q, 'up'))}
      />
      <RigDriver rig={rig} />
      <CameraRig view={view} reducedMotion={reducedMotion} />
      <hemisphereLight args={['#a9b2cc', '#3a281c', night ? 0.02 : 0.75]} />
      <Environment resolution={256} environmentIntensity={night ? 0.04 : 0.7}>
        <Lightformer form="rect" intensity={5} color="#ffe2b0" position={[-7, 6, 5]} scale={[9, 6, 1]} />
        <Lightformer form="rect" intensity={2.4} color="#b8c8ff" position={[7, 4, 6]} scale={[8, 5, 1]} />
        <Lightformer form="rect" intensity={2} color="#ffffff" position={[0, 9, -3]} rotation-x={Math.PI / 2} scale={[14, 8, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 3, -9]} scale={[16, 5, 1]} />
      </Environment>
      <Lamp intensity={lamp} shadowMap={profile.shadowMap} />
      <Desk />
      <TypewriterModel rig={rig} />
      <Ribbon session={session} rig={rig} />
      <Sheet session={session} rig={rig} atlas={atlas} />
    </Canvas>
  )
}
