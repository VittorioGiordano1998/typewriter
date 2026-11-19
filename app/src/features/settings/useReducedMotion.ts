import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(listener: () => void): () => void {
  let mq: MediaQueryList | null = null
  try {
    mq = window.matchMedia(QUERY)
  } catch {
    return () => {}
  }
  mq.addEventListener('change', listener)
  return () => mq?.removeEventListener('change', listener)
}

function snapshot(): boolean {
  try {
    return window.matchMedia(QUERY).matches
  } catch {
    return false
  }
}

/** True when the visitor asked their system for less motion. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false)
}
