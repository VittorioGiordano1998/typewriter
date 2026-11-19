/**
 * The single persisted record: settings and documents, in one versioned JSON value. Reads and
 * writes never throw: with blocked storage (private window, quota, policy) the app keeps working
 * in memory, and data written by a newer app version is left untouched.
 */
import { emptyData, parse, serialize, type StoredData } from '../../core/storage-schema'

export const STORAGE_KEY = 'typewriter.v1'

export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** `localStorage` if it works, else null. Some browsers throw on access, not just on use. */
export function browserStorage(): KeyValueStorage | null {
  try {
    const s = window.localStorage
    const probe = '__typewriter_probe__'
    s.setItem(probe, '1')
    s.removeItem(probe)
    return s
  } catch {
    return null
  }
}

export interface StoredDataStore {
  get(): StoredData
  /** Replaces the data with `fn(current)` and schedules a write. */
  update(fn: (data: StoredData) => StoredData): void
  subscribe(listener: () => void): () => void
  /** False when nothing can be saved: storage is unavailable or holds a newer version. */
  readonly writable: boolean
  /** True when nothing usable was stored before: a first visit. */
  readonly fresh: boolean
  /** Writes now, if a write is pending. */
  flush(): void
  dispose(): void
}

export function createStoredDataStore(storage: KeyValueStorage | null, debounceMs = 400): StoredDataStore {
  let data = emptyData()
  let writable = storage !== null
  let fresh = true
  if (storage) {
    try {
      const result = parse(storage.getItem(STORAGE_KEY))
      if (result.kind === 'ok') {
        data = result.data
        fresh = false
      } else if (result.kind === 'newer') writable = false
    } catch {
      writable = false
    }
  }

  const listeners = new Set<() => void>()
  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false

  const write = () => {
    timer = null
    if (!dirty || !storage || !writable) return
    dirty = false
    try {
      storage.setItem(STORAGE_KEY, serialize(data))
    } catch {
      // Quota or policy: keep going in memory.
    }
  }

  const onHide = () => write()
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') write()
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
  }

  return {
    get: () => data,
    update(fn) {
      data = fn(data)
      dirty = true
      if (timer === null) timer = setTimeout(write, debounceMs)
      for (const l of listeners) l()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    get writable() {
      return writable
    },
    get fresh() {
      return fresh
    },
    flush() {
      if (timer !== null) clearTimeout(timer)
      write()
    },
    dispose() {
      if (timer !== null) clearTimeout(timer)
      write()
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', onHide)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    },
  }
}
