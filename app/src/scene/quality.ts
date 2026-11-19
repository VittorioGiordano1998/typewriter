/**
 * Rendering quality tiers. The scene starts at a tier suited to the device and steps down (or back
 * up) when the frame rate says so.
 */
export type Quality = 'high' | 'medium' | 'low'

export interface QualityProfile {
  /** Device pixel ratio range handed to the renderer. */
  readonly dpr: readonly [number, number]
  /** Spotlight shadow map size in pixels; 0 turns shadows off. */
  readonly shadowMap: number
}

export const QUALITY: Record<Quality, QualityProfile> = {
  high: { dpr: [1, 2], shadowMap: 2048 },
  medium: { dpr: [1, 1.5], shadowMap: 1024 },
  low: { dpr: [0.75, 1], shadowMap: 0 },
}

const ORDER: readonly Quality[] = ['high', 'medium', 'low']

export interface DeviceHints {
  readonly coarsePointer: boolean
  /** `navigator.hardwareConcurrency`, 0 if unknown. */
  readonly cores: number
  /** `navigator.deviceMemory` in GB, 0 if unknown. */
  readonly memoryGb: number
  readonly screenWidth: number
}

/** Phones and weak machines start lower; the monitor then corrects it either way. */
export function initialQuality(d: DeviceHints): Quality {
  const weak = (d.cores > 0 && d.cores <= 4) || (d.memoryGb > 0 && d.memoryGb <= 4)
  if (d.coarsePointer && (weak || d.screenWidth < 500)) return 'low'
  if (d.coarsePointer || weak) return 'medium'
  return 'high'
}

export function stepQuality(current: Quality, direction: 'down' | 'up'): Quality {
  const i = ORDER.indexOf(current)
  const next = direction === 'down' ? Math.min(ORDER.length - 1, i + 1) : Math.max(0, i - 1)
  return ORDER[next]
}

/** Reads the hints from the browser, tolerating missing APIs. */
export function detectDevice(): DeviceHints {
  const nav = navigator as Navigator & { deviceMemory?: number }
  let coarse = false
  try {
    coarse = window.matchMedia('(pointer: coarse)').matches
  } catch {
    // Treat an unknown pointer as a fine one.
  }
  return {
    coarsePointer: coarse,
    cores: nav.hardwareConcurrency ?? 0,
    memoryGb: nav.deviceMemory ?? 0,
    screenWidth: window.screen?.width ?? window.innerWidth,
  }
}
