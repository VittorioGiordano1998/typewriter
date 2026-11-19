import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createState } from '../core/carriage'
import { createDocument } from '../core/page'
import type { Settings } from '../core/storage-schema'
import { createArchive, type Archive } from '../features/archive/archive'
import { ArchiveContext } from '../features/archive/ArchiveContext'
import { browserStorage, createStoredDataStore, type StoredDataStore } from '../features/archive/storedData'
import { AudioEngine } from '../features/audio/audioEngine'
import { detectLanguage, useI18n } from '../features/i18n/context'
import { I18nProvider } from '../features/i18n/I18nProvider'
import { createInputHolder, SessionContext, type SessionBundle } from '../features/session/SessionContext'
import { createSession } from '../features/session/session'
import { SettingsContext, useSettings, useSettingsStore } from '../features/settings/SettingsContext'
import { createSettingsStore, type SettingsStore } from '../features/settings/settingsStore'
import { useReducedMotion } from '../features/settings/useReducedMotion'
import { createViewControl } from '../scene/viewControl'
import { Hud } from '../ui/Hud'
import { PlainSheet } from '../ui/PlainSheet'
import { TextMirror } from '../ui/TextMirror'
import { Toolbar } from '../ui/Toolbar'
import { TypingSurface } from '../ui/TypingSurface'

// three.js is large: the scene is its own chunk, fetched while the fonts load.
const Scene = lazy(() => import('../scene/Scene'))

function newBundle(settings: Settings): SessionBundle {
  const id = crypto.randomUUID()
  const seed = crypto.getRandomValues(new Uint32Array(1))[0]
  const doc = createDocument(id, seed, Date.now())
  return { session: createSession(createState(doc, undefined, settings.ribbon)), input: createInputHolder() }
}

/** Typebars and key legends are drawn from this font: wait for it before building the scene. */
async function loadFonts(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('400 40px "Courier Prime"'),
      document.fonts.load('700 40px "Courier Prime"'),
    ])
  } catch {
    // Fall back to the system monospace font.
  }
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

function Desk({ bundle, archive }: { bundle: SessionBundle; archive: Archive }) {
  const settings = useSettings()
  const [view] = useState(() => createViewControl(0.18))
  const [engine] = useState(() => new AudioEngine(import.meta.env.BASE_URL))
  const [fontsReady, setFontsReady] = useState(false)
  const webgl = useMemo(() => hasWebGL(), [])
  const reducedMotion = useReducedMotion()
  const main = useRef<HTMLElement>(null)
  const pinch = useRef(new Map<number, { x: number; y: number }>())

  useEffect(() => {
    // Dev only: lets scripts/scenario.mjs read the session.
    if (import.meta.env.DEV) (window as unknown as { __session?: unknown }).__session = bundle.session
  }, [bundle])

  useEffect(() => {
    let live = true
    void loadFonts().then(() => live && setFontsReady(true))
    void engine.load()
    return () => {
      live = false
    }
  }, [engine])

  // Open the last sheet (or a fresh one) and keep it saved while typing.
  useEffect(() => archive.start(), [archive])

  useEffect(() => engine.attach(bundle.session), [engine, bundle])
  useEffect(() => {
    engine.configure({ volume: settings.volume, muted: settings.muted })
  }, [engine, settings.volume, settings.muted])

  // The ribbon lever lives in the settings; the machine follows it.
  useEffect(() => {
    bundle.session.dispatch({ type: 'ribbon', ribbon: settings.ribbon })
  }, [bundle, settings.ribbon])

  // A phone's keyboard covers the lower part of the screen: fit the desk to what is left visible.
  useEffect(() => {
    const el = main.current
    const vv = window.visualViewport
    if (!el || !vv) return
    const fit = () => {
      el.style.height = `${vv.height}px`
      el.style.transform = vv.offsetTop > 0 ? `translateY(${vv.offsetTop}px)` : ''
    }
    fit()
    vv.addEventListener('resize', fit)
    vv.addEventListener('scroll', fit)
    return () => {
      vv.removeEventListener('resize', fit)
      vv.removeEventListener('scroll', fit)
    }
  }, [])

  const zoom = useCallback((delta: number) => view.zoomBy(delta), [view])
  const onWheel = useCallback((e: React.WheelEvent) => view.zoomBy(e.deltaY * 0.0009), [view])

  // Two fingers spread or pinch to move the camera in and out.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch') pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }, [])
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const points = pinch.current
      const before = points.get(e.pointerId)
      if (!before) return
      if (points.size === 2) {
        const [a, b] = [...points.values()]
        const prev = Math.hypot(a.x - b.x, a.y - b.y)
        points.set(e.pointerId, { x: e.clientX, y: e.clientY })
        const [c, d] = [...points.values()]
        view.zoomBy(-(Math.hypot(c.x - d.x, c.y - d.y) - prev) * 0.004)
      } else {
        points.set(e.pointerId, { x: e.clientX, y: e.clientY })
      }
    },
    [view],
  )
  const onPointerEnd = useCallback((e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId)
  }, [])

  return (
    <SessionContext.Provider value={bundle}>
      <main
        ref={main}
        className="relative h-full w-full touch-none overflow-hidden bg-desk"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        {!webgl ? (
          <PlainSheet />
        ) : fontsReady ? (
          <Suspense fallback={<Loading />}>
            <Scene session={bundle.session} view={view} lamp={settings.lamp} night={settings.night} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <Loading />
        )}
        {webgl && <TextMirror />}
        <Hud onZoom={zoom} />
        <Toolbar />
        <TypingSurface />
      </main>
    </SessionContext.Provider>
  )
}

function Loading() {
  const { t } = useI18n()
  return (
    <p role="status" className="grid h-full place-items-center font-display text-xl text-paper/70">
      <span className="caret">{t.loading}</span>
    </p>
  )
}

/** Language is a setting: this binds the i18n provider to the settings store. */
function Localised({ store, children }: { store: SettingsStore; children: ReactNode }) {
  const { language } = useSettings()
  const setLanguage = useCallback((l: Settings['language']) => store.set({ language: l }), [store])
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return (
    <I18nProvider lang={language} onLangChange={setLanguage}>
      {children}
    </I18nProvider>
  )
}

function Body({ stored }: { stored: StoredDataStore }) {
  const store = useSettingsStore()
  const [bundle] = useState(() => newBundle(store.get()))
  const [archive] = useState(() => createArchive(stored, bundle.session))
  return (
    <Localised store={store}>
      <ArchiveContext.Provider value={archive}>
        <Desk bundle={bundle} archive={archive} />
      </ArchiveContext.Provider>
    </Localised>
  )
}

export function App() {
  const [{ stored, settings }] = useState(() => {
    const stored = createStoredDataStore(browserStorage())
    const settings = createSettingsStore(stored)
    // First visit: start in the browser's language.
    if (stored.fresh) settings.set({ language: detectLanguage() })
    return { stored, settings }
  })
  return (
    <SettingsContext.Provider value={settings}>
      <Body stored={stored} />
    </SettingsContext.Provider>
  )
}
