import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { emptyData } from '../src/core/storage-schema'
import { openCloudStore } from '../src/features/cloud/cloudStore'

function service() {
  let row: { data: unknown; revision: number } | null = null
  let fail = false
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      insert: (value: { data: unknown; revision: number }) => ({ select: () => ({ maybeSingle: async () => {
        if (fail) return { data: null, error: { code: 'offline' } }
        if (row) return { data: null, error: { code: '23505' } }
        row = value
        return { data: { revision: row.revision }, error: null }
      } }) }),
      update: (value: { data: unknown; revision: number }) => ({ eq: () => ({ eq: (_key: string, revision: number) => ({ select: () => ({ maybeSingle: async () => {
        if (fail) return { data: null, error: { code: 'offline' } }
        if (!row || row.revision !== revision) return { data: null, error: null }
        row = value
        return { data: { revision: row.revision }, error: null }
      } }) }) }) }),
    }),
  } as unknown as SupabaseClient
  return { client, offline: (value: boolean) => { fail = value } }
}

function storage() {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } }
}

describe('account archive synchronization', () => {
  it('saves an account archive and reloads it', async () => {
    const api = service()
    const cloud = await openCloudStore(api.client, 'alice', storage())
    cloud.store.update(() => ({ ...emptyData(), settings: { ...emptyData().settings, night: true } }))
    expect(await cloud.waitForSave()).toBe(true)
    const reopened = await openCloudStore(api.client, 'alice', storage())
    expect(reopened.store.get().settings.night).toBe(true)
  })

  it('keeps failed changes as a local draft and retries', async () => {
    const api = service()
    const local = storage()
    const cloud = await openCloudStore(api.client, 'alice', local)
    api.offline(true)
    cloud.store.update(() => ({ ...emptyData(), settings: { ...emptyData().settings, night: true } }))
    expect(await cloud.waitForSave()).toBe(false)
    expect(cloud.status()).toBe('error')
    api.offline(false)
    await cloud.retry()
    expect(cloud.status()).toBe('saved')
    expect((await openCloudStore(api.client, 'alice', local)).store.get().settings.night).toBe(true)
  })

  it('refuses to overwrite an archive changed in another session', async () => {
    const api = service()
    const first = await openCloudStore(api.client, 'alice', storage())
    const second = await openCloudStore(api.client, 'alice', storage())
    first.store.update(() => ({ ...emptyData(), settings: { ...emptyData().settings, night: true } }))
    await first.waitForSave()
    second.store.update(() => ({ ...emptyData(), settings: { ...emptyData().settings, muted: true } }))
    expect(await second.waitForSave()).toBe(false)
    expect(second.status()).toBe('conflict')
    expect((await openCloudStore(api.client, 'alice', storage())).store.get().settings.night).toBe(true)
  })
})
