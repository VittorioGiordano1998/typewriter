import { createContext, useContext, useSyncExternalStore } from 'react'
import type { Settings } from '../../core/storage-schema'
import type { SettingsStore } from './settingsStore'

export const SettingsContext = createContext<SettingsStore | null>(null)

export function useSettingsStore(): SettingsStore {
  const store = useContext(SettingsContext)
  if (!store) throw new Error('useSettingsStore must be used inside a SettingsContext provider')
  return store
}

/** The current settings; re-renders when any of them changes. */
export function useSettings(): Settings {
  const store = useSettingsStore()
  return useSyncExternalStore(store.subscribe, store.get)
}
