import { useState, useSyncExternalStore } from 'react'
import { useI18n } from '../features/i18n/context'
import { useSettings, useSettingsStore } from '../features/settings/SettingsContext'
import { useSessionBundle } from '../features/session/SessionContext'

interface Props {
  onZoom(delta: number): void
}

function isTouchDevice(): boolean {
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}

function useHasTyped(): boolean {
  const { session } = useSessionBundle()
  return useSyncExternalStore(session.subscribe, () => session.getState().doc.strikeCount > 0)
}

const BUTTON =
  'grid h-10 w-10 place-items-center rounded-full bg-black/45 text-xl text-paper backdrop-blur hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-brass'

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      {muted ? (
        <path d="M17 9l5 6M22 9l-5 6" />
      ) : (
        <>
          <path d="M16.5 8.5a5 5 0 0 1 0 7" />
          <path d="M19 6a8.5 8.5 0 0 1 0 12" />
        </>
      )}
    </svg>
  )
}

/** The few controls drawn over the scene. Phase 5 grows this into the full toolbar. */
export function Hud({ onZoom }: Props) {
  const { t } = useI18n()
  const typed = useHasTyped()
  const [touch] = useState(isTouchDevice)
  const settings = useSettings()
  const store = useSettingsStore()
  const label = settings.muted ? t.unmute : t.mute

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-8 px-4 text-center transition-opacity duration-700 motion-reduce:transition-none ${typed ? 'opacity-0' : 'opacity-100'}`}
      >
        <p className="font-display text-2xl text-paper/90">{t.hint}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-paper/60">{touch ? t.hintTouch : t.hintDetail}</p>
      </div>
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          aria-label={label}
          aria-pressed={settings.muted}
          title={label}
          onClick={() => store.set({ muted: !settings.muted })}
          className={BUTTON}
        >
          <SpeakerIcon muted={settings.muted} />
        </button>
        <button type="button" aria-label={t.zoomIn} title={t.zoomIn} onClick={() => onZoom(-0.2)} className={BUTTON}>
          +
        </button>
        <button type="button" aria-label={t.zoomOut} title={t.zoomOut} onClick={() => onZoom(0.2)} className={BUTTON}>
          −
        </button>
      </div>
    </>
  )
}
