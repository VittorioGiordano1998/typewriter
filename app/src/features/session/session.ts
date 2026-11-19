/**
 * The live typing session: an external store holding the typewriter state, plus an event bus for
 * the scene and the sound engine. Nothing here touches React rendering, so a keystroke never
 * re-renders the component tree.
 */
import { reduce, type Action, type TypewriterEvent, type TypewriterState } from '../../core/carriage'

export type EventListener = (event: TypewriterEvent) => void

export interface Session {
  getState(): TypewriterState
  /** Called after every state change (for `useSyncExternalStore`). */
  subscribe(listener: () => void): () => void
  /** Called with each typewriter event, in order. */
  onEvent(listener: EventListener): () => void
  /** Applies an action and returns the events it produced. */
  dispatch(action: Action): readonly TypewriterEvent[]
  /** Called after `load`, so the machine can snap to the new state instead of animating to it. */
  onReset(listener: () => void): () => void
  /** Replaces the whole state (open another sheet). */
  load(state: TypewriterState): void
}

export function createSession(initial: TypewriterState): Session {
  let state = initial
  const subscribers = new Set<() => void>()
  const listeners = new Set<EventListener>()
  const resetListeners = new Set<() => void>()

  return {
    getState: () => state,
    subscribe(listener) {
      subscribers.add(listener)
      return () => subscribers.delete(listener)
    },
    onEvent(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    onReset(listener) {
      resetListeners.add(listener)
      return () => resetListeners.delete(listener)
    },
    dispatch(action) {
      const result = reduce(state, action, Date.now())
      if (result.state !== state) {
        state = result.state
        for (const s of subscribers) s()
      }
      for (const e of result.events) for (const l of listeners) l(e)
      return result.events
    },
    load(next) {
      state = next
      for (const s of subscribers) s()
      for (const r of resetListeners) r()
    },
  }
}
