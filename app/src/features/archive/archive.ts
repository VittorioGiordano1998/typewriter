/**
 * The sheet archive: keeps the open document saved as you type and lets you start, reopen,
 * rename and delete sheets. It owns the link between the live session and the stored record.
 */
import { createState } from '../../core/carriage'
import { pageToText } from '../../core/export-text'
import { createDocument } from '../../core/page'
import { fromStored, toStored, type StoredDocument } from '../../core/storage-schema'
import type { Session } from '../session/session'
import type { StoredDataStore } from './storedData'

export interface DocSummary {
  readonly id: string
  readonly title: string
  /** First line of text, for sheets without a title. */
  readonly preview: string
  readonly updatedAt: number
  readonly pages: number
  readonly strikes: number
}

export interface Archive {
  /** Opens the last sheet (or starts one) and begins saving. */
  start(): () => void
  /** Sheets, most recently changed first. Includes the open one. */
  list(): readonly DocSummary[]
  activeId(): string
  /** Title of the open sheet; empty when it has none. */
  activeTitle(): string
  /** False when nothing can be saved (blocked storage, or a newer app version wrote it). */
  readonly canSave: boolean
  readonly saveBlockedBy: 'none' | 'unavailable'
  /** Immediately persist the current sheet. */
  flush(): void
  newDocument(): void
  open(id: string): void
  rename(id: string, title: string): void
  remove(id: string): void
  /** Notified when the list or the active sheet changes. */
  subscribe(listener: () => void): () => void
}

export interface ArchiveDeps {
  readonly now?: () => number
  readonly newId?: () => string
  readonly newSeed?: () => number
  /** Delay before a burst of typing is written to the store. */
  readonly saveDelayMs?: number
}

function isBlank(d: StoredDocument): boolean {
  return d.title.trim() === '' && d.pages.every((p) => p.length === 0)
}

export function summarize(d: StoredDocument): DocSummary {
  const { doc } = fromStored(d)
  let preview = ''
  for (const page of doc.pages) {
    const line = pageToText(page)
      .split('\n')
      .find((l) => l.trim() !== '')
    if (line) {
      preview = line.trim().slice(0, 80)
      break
    }
  }
  return {
    id: d.id,
    title: d.title,
    preview,
    updatedAt: d.updatedAt,
    pages: d.pages.length,
    strikes: d.strikeCount,
  }
}

export function createArchive(stored: StoredDataStore, session: Session, deps: ArchiveDeps = {}): Archive {
  const now = deps.now ?? Date.now
  const newId = deps.newId ?? (() => crypto.randomUUID())
  const newSeed = deps.newSeed ?? (() => crypto.getRandomValues(new Uint32Array(1))[0])
  const saveDelayMs = deps.saveDelayMs ?? 300

  let timer: ReturnType<typeof setTimeout> | null = null
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const l of listeners) l()
  }

  /** Writes the open document into the store, replacing its previous version. */
  const save = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    const { doc, cursor } = session.getState()
    const record = toStored(doc, cursor)
    stored.update((d) => {
      const exists = d.documents.some((x) => x.id === doc.id)
      const documents = exists
        ? d.documents.map((x) => (x.id === doc.id ? { ...record, title: x.title } : x))
        : [...d.documents, record]
      return { ...d, activeId: doc.id, documents }
    })
  }

  const scheduleSave = () => {
    if (timer === null) timer = setTimeout(save, saveDelayMs)
  }

  /** Drops the open document if it was never used, so "New sheet" cannot pile up blank pages. */
  const dropIfBlank = (id: string) => {
    const d = stored.get().documents.find((x) => x.id === id)
    if (d && isBlank(d)) stored.update((s) => ({ ...s, documents: s.documents.filter((x) => x.id !== id) }))
  }

  const loadRecord = (record: StoredDocument) => {
    const { doc, cursor } = fromStored(record)
    session.load(createState(doc, cursor, session.getState().ribbon))
    stored.update((d) => ({ ...d, activeId: record.id }))
  }

  const startBlank = () => {
    const doc = createDocument(newId(), newSeed(), now())
    session.load(createState(doc, undefined, session.getState().ribbon))
    save()
  }

  const onHide = () => {
    save()
    stored.flush()
  }
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') onHide()
  }

  return {
    start() {
      const { activeId, documents } = stored.get()
      const last = documents.find((d) => d.id === activeId) ?? [...documents].sort((a, b) => b.updatedAt - a.updatedAt)[0]
      if (last) loadRecord(last)
      else startBlank()
      // Blank leftovers from earlier visits are not worth keeping.
      for (const d of stored.get().documents) if (d.id !== session.getState().doc.id && isBlank(d)) dropIfBlank(d.id)
      const off = session.subscribe(scheduleSave)
      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', onHide)
        document.addEventListener('visibilitychange', onVisibility)
      }
      notify()
      return () => {
        off()
        save()
        if (typeof window !== 'undefined') {
          window.removeEventListener('pagehide', onHide)
          document.removeEventListener('visibilitychange', onVisibility)
        }
      }
    },

    list() {
      return [...stored.get().documents].map(summarize).sort((a, b) => b.updatedAt - a.updatedAt)
    },

    activeId: () => session.getState().doc.id,

    activeTitle: () => stored.get().documents.find((d) => d.id === session.getState().doc.id)?.title ?? '',

    get canSave() {
      return stored.writable
    },

    get saveBlockedBy() {
      return stored.writable ? 'none' : 'unavailable'
    },

    flush() {
      save()
      stored.flush()
    },

    newDocument() {
      const leaving = session.getState().doc.id
      save()
      startBlank()
      dropIfBlank(leaving)
      notify()
    },

    open(id) {
      const current = session.getState().doc.id
      if (id === current) return
      const target = stored.get().documents.find((d) => d.id === id)
      if (!target) return
      save()
      loadRecord(target)
      dropIfBlank(current)
      notify()
    },

    rename(id, title) {
      const clean = title.trim().slice(0, 120)
      if (id === session.getState().doc.id) save()
      stored.update((d) => ({ ...d, documents: d.documents.map((x) => (x.id === id ? { ...x, title: clean } : x)) }))
      notify()
    },

    remove(id) {
      const wasActive = id === session.getState().doc.id
      if (wasActive && timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      stored.update((d) => ({ ...d, documents: d.documents.filter((x) => x.id !== id) }))
      if (wasActive) {
        const next = [...stored.get().documents].sort((a, b) => b.updatedAt - a.updatedAt)[0]
        if (next) loadRecord(next)
        else startBlank()
      }
      notify()
    },

    subscribe(listener) {
      listeners.add(listener)
      const off = stored.subscribe(listener)
      return () => {
        listeners.delete(listener)
        off()
      }
    },
  }
}
