import { emptyData, parse, serialize, type StoredData } from '../../core/storage-schema'
import { createStoredDataStore, type KeyValueStorage, type StoredDataStore } from '../archive/storedData'
import type { SupabaseClient } from '@supabase/supabase-js'

export type SyncStatus = 'saved' | 'saving' | 'error' | 'conflict'
type Draft = { revision: number | null; data: StoredData }

/** Loads a private archive and persists pending changes locally until the server accepts them. */
export async function openCloudStore(client: SupabaseClient, userId: string, storage: KeyValueStorage | null) {
  const key = `typewriter.cloud.${userId}`
  const { data: row, error } = await client.from('typewriter_archives').select('data,revision').eq('user_id', userId).maybeSingle()
  if (error) throw error
  const parsed = row ? parse(JSON.stringify(row.data)) : { kind: 'empty' as const }
  if (parsed.kind === 'newer') throw new Error('newer')
  if (row && parsed.kind !== 'ok') throw new Error('invalid')
  let revision: number | null = row?.revision ?? null
  let initial = parsed.kind === 'ok' ? parsed.data : emptyData()
  let pending = false
  let conflict = false
  try {
    const raw = storage?.getItem(key)
    if (raw) {
      const draft = JSON.parse(raw) as Draft
      const valid = parse(JSON.stringify(draft.data))
      if (valid.kind === 'ok') {
        initial = valid.data
        pending = true
        conflict = draft.revision !== revision
        revision = draft.revision
      }
    }
  } catch { /* Cloud data remains available if local storage is blocked. */ }
  const memory: KeyValueStorage = { getItem: () => serialize(initial), setItem: () => {} }
  const base = createStoredDataStore(memory)
  let status: SyncStatus = conflict ? 'conflict' : pending ? 'error' : 'saved'
  let dirty = pending
  let running = false
  const listeners = new Set<(status: SyncStatus) => void>()
  const setStatus = (next: SyncStatus) => { status = next; listeners.forEach((listener) => listener(next)) }
  const saveDraft = () => {
    try { storage?.setItem(key, JSON.stringify({ revision, data: base.get() })) } catch { /* Report cloud errors in the UI. */ }
  }
  const sync = async () => {
    if (running || conflict || !dirty) return
    running = true
    setStatus('saving')
    while (dirty && !conflict) {
      dirty = false
      const snapshot = base.get()
      let result
      try {
        result = revision === null
        ? await client.from('typewriter_archives').insert({ user_id: userId, data: snapshot, revision: 1 }).select('revision').maybeSingle()
        : await client.from('typewriter_archives').update({ data: snapshot, revision: revision + 1 }).eq('user_id', userId).eq('revision', revision).select('revision').maybeSingle()
      } catch {
        dirty = true
        saveDraft()
        setStatus('error')
        running = false
        return
      }
      if (result.error || !result.data) {
        dirty = true
        conflict = !result.data && !result.error || result.error?.code === '23505'
        saveDraft()
        setStatus(conflict ? 'conflict' : 'error')
        running = false
        return
      }
      revision = result.data.revision
      if (dirty) saveDraft()
    }
    try { storage?.setItem(key, '') } catch { /* Already saved remotely. */ }
    running = false
    setStatus('saved')
  }
  const store: StoredDataStore = {
    ...base,
    get writable() { return true },
    get fresh() { return !row && !pending },
    update(fn) {
      const next = fn(base.get())
      if (serialize(next) === serialize(base.get())) return
      base.update(() => next); dirty = true; saveDraft(); void sync()
    },
  }
  if (pending && !conflict) void sync()
  return { store, status: () => status, async waitForSave() {
    if (status === 'saved') return true
    if (status === 'error' || status === 'conflict') return false
    return new Promise<boolean>((resolve) => {
      const listener = (next: SyncStatus) => {
        if (next === 'saving') return
        listeners.delete(listener)
        resolve(next === 'saved')
      }
      listeners.add(listener)
    })
  }, subscribe(listener: (status: SyncStatus) => void) { listeners.add(listener); return () => { listeners.delete(listener) } }, retry: sync }
}
