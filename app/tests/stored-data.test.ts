import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../src/core/storage-schema'
import { createStoredDataStore, STORAGE_KEY, type KeyValueStorage } from '../src/features/archive/storedData'
import { createSettingsStore } from '../src/features/settings/settingsStore'

function memoryStorage(initial?: string) {
  const map = new Map<string, string>()
  if (initial !== undefined) map.set(STORAGE_KEY, initial)
  const setItem = vi.fn((k: string, v: string) => void map.set(k, v))
  const storage: KeyValueStorage = { getItem: (k) => map.get(k) ?? null, setItem }
  return { storage, setItem, map }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('stored data store', () => {
  it('starts fresh and empty when nothing is stored', () => {
    const { storage } = memoryStorage()
    const store = createStoredDataStore(storage)
    expect(store.fresh).toBe(true)
    expect(store.writable).toBe(true)
    expect(store.get().documents).toEqual([])
    expect(store.get().settings).toEqual(DEFAULT_SETTINGS)
  })

  it('debounces writes into one and survives a reload', () => {
    const { storage, setItem } = memoryStorage()
    const store = createStoredDataStore(storage, 400)
    store.update((d) => ({ ...d, settings: { ...d.settings, language: 'it' } }))
    store.update((d) => ({ ...d, settings: { ...d.settings, muted: true } }))
    expect(setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(400)
    expect(setItem).toHaveBeenCalledTimes(1)

    const reloaded = createStoredDataStore(storage)
    expect(reloaded.fresh).toBe(false)
    expect(reloaded.get().settings).toMatchObject({ language: 'it', muted: true })
  })

  it('flushes on demand', () => {
    const { storage, setItem } = memoryStorage()
    const store = createStoredDataStore(storage)
    store.update((d) => d)
    store.flush()
    expect(setItem).toHaveBeenCalledTimes(1)
    store.flush()
    expect(setItem).toHaveBeenCalledTimes(1)
  })

  it('keeps working in memory when storage is unavailable', () => {
    const store = createStoredDataStore(null)
    expect(store.writable).toBe(false)
    store.update((d) => ({ ...d, settings: { ...d.settings, night: true } }))
    vi.advanceTimersByTime(1000)
    expect(store.get().settings.night).toBe(true)
  })

  it('survives storage that throws on read or write', () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    const store = createStoredDataStore(throwing)
    expect(store.writable).toBe(false)
    store.update((d) => d)
    expect(() => store.flush()).not.toThrow()

    const writeOnly: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    const s2 = createStoredDataStore(writeOnly)
    s2.update((d) => d)
    expect(() => vi.advanceTimersByTime(1000)).not.toThrow()
  })

  it('starts empty on corrupt data, and then overwrites it', () => {
    const { storage, map } = memoryStorage('{oops')
    const store = createStoredDataStore(storage)
    expect(store.fresh).toBe(true)
    expect(store.writable).toBe(true)
    store.update((d) => d)
    store.flush()
    expect(JSON.parse(map.get(STORAGE_KEY) ?? '{}').version).toBe(SCHEMA_VERSION)
  })

  it('never overwrites data written by a newer version', () => {
    const newer = JSON.stringify({ version: SCHEMA_VERSION + 1, documents: [{ secret: true }] })
    const { storage, setItem, map } = memoryStorage(newer)
    const store = createStoredDataStore(storage)
    expect(store.writable).toBe(false)
    store.update((d) => ({ ...d, settings: { ...d.settings, night: true } }))
    store.flush()
    vi.advanceTimersByTime(1000)
    expect(setItem).not.toHaveBeenCalled()
    expect(map.get(STORAGE_KEY)).toBe(newer)
  })

  it('notifies subscribers on update until unsubscribed', () => {
    const store = createStoredDataStore(memoryStorage().storage)
    let n = 0
    const off = store.subscribe(() => n++)
    store.update((d) => d)
    off()
    store.update((d) => d)
    expect(n).toBe(1)
  })
})

describe('settings store', () => {
  it('merges a patch into the settings and persists it', () => {
    const { storage } = memoryStorage()
    const stored = createStoredDataStore(storage)
    const settings = createSettingsStore(stored)
    let n = 0
    settings.subscribe(() => n++)
    settings.set({ muted: true })
    settings.set({ lamp: 0.2 })
    expect(settings.get()).toEqual({ ...DEFAULT_SETTINGS, muted: true, lamp: 0.2 })
    expect(n).toBe(2)
    stored.flush()
    expect(createSettingsStore(createStoredDataStore(storage)).get().muted).toBe(true)
  })

  it('keeps the documents when settings change', () => {
    const stored = createStoredDataStore(memoryStorage().storage)
    stored.update((d) => ({ ...d, activeId: 'x' }))
    createSettingsStore(stored).set({ night: true })
    expect(stored.get().activeId).toBe('x')
  })
})
