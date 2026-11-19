import { useCallback, useState, type ReactNode } from 'react'
import { useArchive } from '../features/archive/ArchiveContext'
import { useI18n } from '../features/i18n/context'
import { ArchivePanel } from './ArchivePanel'
import { CreditsPanel } from './CreditsPanel'
import { ExportPanel } from './ExportPanel'
import { ExportIcon, InfoIcon, PlusIcon, SheetsIcon, SlidersIcon } from './icons'
import { SettingsPanel } from './SettingsPanel'

type PanelId = 'archive' | 'export' | 'settings' | 'credits'

const BUTTON =
  'flex h-10 items-center gap-2 rounded-full bg-black/45 px-3 text-sm text-paper backdrop-blur hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-brass'

function ToolButton({ label, onClick, children }: { label: string; onClick(): void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={BUTTON}>
      {children}
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}

/** The controls at the top left, and the panels they open. */
export function Toolbar() {
  const { t } = useI18n()
  const archive = useArchive()
  const [open, setOpen] = useState<PanelId | null>(null)
  const close = useCallback(() => setOpen(null), [])

  return (
    <>
      <nav aria-label={t.appName} className="absolute left-4 top-4 flex max-w-[calc(100%-9.5rem)] flex-wrap gap-2">
        <ToolButton label={t.sheets} onClick={() => setOpen('archive')}>
          <SheetsIcon />
        </ToolButton>
        <ToolButton label={t.newSheet} onClick={() => archive.newDocument()}>
          <PlusIcon />
        </ToolButton>
        <ToolButton label={t.exportMenu} onClick={() => setOpen('export')}>
          <ExportIcon />
        </ToolButton>
        <ToolButton label={t.settings} onClick={() => setOpen('settings')}>
          <SlidersIcon />
        </ToolButton>
        <ToolButton label={t.credits} onClick={() => setOpen('credits')}>
          <InfoIcon />
        </ToolButton>
      </nav>
      {open === 'archive' && <ArchivePanel onClose={close} />}
      {open === 'export' && <ExportPanel onClose={close} />}
      {open === 'settings' && <SettingsPanel onClose={close} />}
      {open === 'credits' && <CreditsPanel onClose={close} />}
    </>
  )
}
