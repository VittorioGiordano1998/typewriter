import { createContext, useContext, useSyncExternalStore } from 'react'
import type { TypewriterState } from '../../core/carriage'
import type { InputController } from './inputController'
import type { Session } from './session'

/** Where the mounted typing surface registers itself, so controls can type programmatically. */
export interface InputHolder {
  get(): InputController | null
  set(controller: InputController | null): void
}

export function createInputHolder(): InputHolder {
  let current: InputController | null = null
  return {
    get: () => current,
    set(controller) {
      current = controller
    },
  }
}

export interface SessionBundle {
  readonly session: Session
  readonly input: InputHolder
}

export const SessionContext = createContext<SessionBundle | null>(null)

export function useSessionBundle(): SessionBundle {
  const bundle = useContext(SessionContext)
  if (!bundle) throw new Error('useSessionBundle must be used inside a SessionContext provider')
  return bundle
}

/** Subscribes a component to the typing state. Re-renders on every change: use sparingly. */
export function useTypewriterState(): TypewriterState {
  const { session } = useSessionBundle()
  return useSyncExternalStore(session.subscribe, session.getState)
}
