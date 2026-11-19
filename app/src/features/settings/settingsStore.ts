import type { Settings } from '../../core/storage-schema'
import type { StoredDataStore } from '../archive/storedData'

export interface SettingsStore {
  get(): Settings
  set(patch: Partial<Settings>): void
  subscribe(listener: () => void): () => void
}

/** Settings live inside the persisted record; this is just a typed view of that part. */
export function createSettingsStore(stored: StoredDataStore): SettingsStore {
  return {
    get: () => stored.get().settings,
    set(patch) {
      stored.update((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
    },
    subscribe: (listener) => stored.subscribe(listener),
  }
}
