import { useState } from 'react'
import { useArchive } from '../features/archive/ArchiveContext'
import { exportPdf, exportPng, exportTxt } from '../features/export/exporters'
import { useI18n } from '../features/i18n/context'
import { useSessionBundle } from '../features/session/SessionContext'
import { Panel } from './Panel'

interface Props {
  onClose(): void
}

type Kind = 'png' | 'pdf' | 'txt'

const BUTTON =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-left hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brass disabled:opacity-50'

export function ExportPanel({ onClose }: Props) {
  const { t } = useI18n()
  const { session } = useSessionBundle()
  const archive = useArchive()
  const [busy, setBusy] = useState<Kind | null>(null)
  const [failed, setFailed] = useState(false)

  const run = async (kind: Kind) => {
    const { doc, cursor } = session.getState()
    const title = archive.activeTitle()
    setBusy(kind)
    setFailed(false)
    try {
      if (kind === 'txt') exportTxt(doc, title)
      else if (kind === 'png') await exportPng(doc, cursor.page, title)
      else await exportPdf(doc, title)
      onClose()
    } catch {
      setFailed(true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <Panel title={t.exportTitle} onClose={onClose} placement="center">
      <div className="space-y-2">
        <button type="button" data-autofocus className={BUTTON} disabled={busy !== null} onClick={() => void run('png')}>
          {t.exportPng}
        </button>
        <button type="button" className={BUTTON} disabled={busy !== null} onClick={() => void run('pdf')}>
          {t.exportPdf}
        </button>
        <button type="button" className={BUTTON} disabled={busy !== null} onClick={() => void run('txt')}>
          {t.exportTxt}
        </button>
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-paper/70">
        {busy ? t.exporting : failed ? t.exportFailed : ''}
      </p>
    </Panel>
  )
}
