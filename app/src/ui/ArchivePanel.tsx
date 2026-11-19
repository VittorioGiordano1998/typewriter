import { useEffect, useState } from 'react'
import { useArchive } from '../features/archive/ArchiveContext'
import type { DocSummary } from '../features/archive/archive'
import { useI18n } from '../features/i18n/context'
import { PencilIcon, PlusIcon, TrashIcon } from './icons'
import { Panel } from './Panel'

interface Props {
  onClose(): void
}

function formatDate(ms: number, lang: string): string {
  try {
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ms)
  } catch {
    return new Date(ms).toLocaleString()
  }
}

/** Moves the keyboard to a control the moment it appears (a rename field, a confirm button). */
function focusOnMount(el: HTMLElement | null): void {
  el?.focus()
}

const ICON_BUTTON =
  'grid h-8 w-8 shrink-0 place-items-center rounded-full text-paper/70 hover:bg-white/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-brass'

export function ArchivePanel({ onClose }: Props) {
  const { t, lang } = useI18n()
  const archive = useArchive()
  const [sheets, setSheets] = useState<readonly DocSummary[]>(() => archive.list())
  const [activeId, setActiveId] = useState(() => archive.activeId())
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  useEffect(
    () =>
      archive.subscribe(() => {
        setSheets(archive.list())
        setActiveId(archive.activeId())
      }),
    [archive],
  )

  const commitRename = (id: string) => {
    archive.rename(id, draft)
    setRenaming(null)
  }

  const label = (d: DocSummary) => d.title || d.preview || t.emptySheet

  return (
    <Panel title={t.archiveTitle} onClose={onClose}>
      {archive.saveBlockedBy !== 'none' && (
        <p role="status" className="mb-3 rounded-lg bg-amber-900/40 p-3 text-sm text-amber-100">
          {t.storageBlocked}
        </p>
      )}
      <button
        type="button"
        data-autofocus
        onClick={() => {
          archive.newDocument()
          onClose()
        }}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brass px-3 py-2 font-medium text-desk hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
      >
        <PlusIcon /> {t.newSheet}
      </button>
      <ul className="space-y-2">
        {sheets.map((d) => {
          const active = d.id === activeId
          return (
            <li key={d.id} className={`rounded-lg border p-2 ${active ? 'border-brass/70 bg-white/10' : 'border-white/10 bg-white/5'}`}>
              {renaming === d.id ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    commitRename(d.id)
                  }}
                >
                  <input
                    ref={focusOnMount}
                    aria-label={t.renameLabel}
                    value={draft}
                    maxLength={120}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        setRenaming(null)
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border border-white/20 bg-black/30 px-2 py-1 text-paper outline-none focus:border-brass"
                  />
                  <button type="submit" className="rounded-md bg-brass px-2 py-1 text-sm font-medium text-desk">
                    {t.save}
                  </button>
                </form>
              ) : confirming === d.id ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="flex-1">{t.confirmDelete}</span>
                  <button
                    type="button"
                    ref={focusOnMount}
                    onClick={() => {
                      archive.remove(d.id)
                      setConfirming(null)
                    }}
                    className="rounded-md bg-red-700 px-2 py-1 font-medium text-white hover:bg-red-600"
                  >
                    {t.confirmYes}
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/20">
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      archive.open(d.id)
                      onClose()
                    }}
                    aria-label={`${t.openSheet}: ${label(d)}`}
                    aria-current={active ? 'true' : undefined}
                    className="min-w-0 flex-1 rounded-md px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-brass"
                  >
                    <span className={`block truncate ${d.title || d.preview ? '' : 'italic text-paper/60'}`}>{label(d)}</span>
                    <span className="block truncate text-xs text-paper/55">
                      {active ? `${t.currentSheet} · ` : ''}
                      {formatDate(d.updatedAt, lang)} · {d.pages} {d.pages === 1 ? t.sheetOne : t.sheetMany}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`${t.rename}: ${label(d)}`}
                    title={t.rename}
                    className={ICON_BUTTON}
                    onClick={() => {
                      setDraft(d.title)
                      setRenaming(d.id)
                    }}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`${t.deleteSheet}: ${label(d)}`}
                    title={t.deleteSheet}
                    className={ICON_BUTTON}
                    onClick={() => setConfirming(d.id)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
