import type { ReactNode } from 'react'
import type { Language, Settings } from '../core/storage-schema'
import { RIBBON_COLOR } from '../core/ink'
import { useI18n } from '../features/i18n/context'
import { useSettings, useSettingsStore } from '../features/settings/SettingsContext'
import { Panel } from './Panel'

interface Props {
  onClose(): void
}

const LANGUAGES: readonly { id: Language; label: string }[] = [
  { id: 'it', label: 'Italiano' },
  { id: 'en', label: 'English' },
]

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <fieldset className="mb-5 min-w-0 border-0 p-0">
      <legend className="mb-2 text-sm text-paper/70">{label}</legend>
      {children}
    </fieldset>
  )
}

function Choice({ selected, onSelect, children }: { selected: boolean; onSelect(): void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 focus-visible:outline-2 focus-visible:outline-brass ${
        selected ? 'border-brass bg-brass/20' : 'border-white/15 bg-white/5 hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  )
}

export function SettingsPanel({ onClose }: Props) {
  const { t } = useI18n()
  const store = useSettingsStore()
  const settings: Settings = useSettings()

  return (
    <Panel title={t.settingsTitle} onClose={onClose}>
      <Field label={t.language}>
        <div role="radiogroup" aria-label={t.language} className="flex gap-2">
          {LANGUAGES.map((l) => (
            <Choice key={l.id} selected={settings.language === l.id} onSelect={() => store.set({ language: l.id })}>
              {l.label}
            </Choice>
          ))}
        </div>
      </Field>

      <Field label={t.ribbon}>
        <div role="radiogroup" aria-label={t.ribbon} className="flex gap-2">
          {(['black', 'red'] as const).map((r) => (
            <Choice key={r} selected={settings.ribbon === r} onSelect={() => store.set({ ribbon: r })}>
              <span className="h-3 w-6 rounded-sm border border-white/30" style={{ background: RIBBON_COLOR[r] }} aria-hidden="true" />
              {r === 'black' ? t.ribbonBlack : t.ribbonRed}
            </Choice>
          ))}
        </div>
      </Field>

      <Field label={t.backspaceMode}>
        <div role="radiogroup" aria-label={t.backspaceMode} className="flex flex-col gap-2 sm:flex-row">
          <Choice selected={settings.backspace === 'crossOut'} onSelect={() => store.set({ backspace: 'crossOut' })}>
            {t.backspaceCrossOut}
          </Choice>
          <Choice selected={settings.backspace === 'move'} onSelect={() => store.set({ backspace: 'move' })}>
            {t.backspaceMove}
          </Choice>
        </div>
      </Field>

      <Field label={t.lamp}>
        <input
          type="range"
          min={0.15}
          max={1}
          step={0.05}
          value={settings.lamp}
          aria-label={t.lamp}
          onChange={(e) => store.set({ lamp: Number(e.target.value) })}
          className="w-full accent-[#c9a24a]"
        />
        <label className="mt-3 flex items-center gap-3">
          <input
            type="checkbox"
            checked={settings.night}
            onChange={(e) => store.set({ night: e.target.checked })}
            className="h-4 w-4 accent-[#c9a24a]"
          />
          <span>{t.night}</span>
        </label>
      </Field>

      <Field label={t.volume}>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          aria-label={t.volume}
          onChange={(e) => store.set({ volume: Number(e.target.value) })}
          className="w-full accent-[#c9a24a]"
        />
      </Field>
    </Panel>
  )
}
