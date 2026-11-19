import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createState } from '../core/carriage'
import { createDocument } from '../core/page'
import { parse, type Settings } from '../core/storage-schema'
import type { Session as AuthSession } from '@supabase/supabase-js'
import { supabase } from '../features/cloud/client'
import { openCloudStore, type SyncStatus } from '../features/cloud/cloudStore'
import { DICTS } from '../features/i18n/context'
import { STORAGE_KEY } from '../features/archive/storedData'
import { createArchive, type Archive } from '../features/archive/archive'
import { ArchiveContext } from '../features/archive/ArchiveContext'
import { browserStorage, type StoredDataStore } from '../features/archive/storedData'
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

function Body({ stored, archiveRef }: { stored: StoredDataStore; archiveRef: React.RefObject<Archive | null> }) {
  const store = useSettingsStore()
  const [bundle] = useState(() => newBundle(store.get()))
  const [archive] = useState(() => createArchive(stored, bundle.session))
  archiveRef.current = archive
  return (
    <Localised store={store}>
      <ArchiveContext.Provider value={archive}>
        <Desk bundle={bundle} archive={archive} />
      </ArchiveContext.Provider>
    </Localised>
  )
}

type CloudArchive = Awaited<ReturnType<typeof openCloudStore>>

function AccountDesk({ cloud, onSignOut }: { cloud: CloudArchive; onSignOut: () => void }) {
  const [settings] = useState(() => createSettingsStore(cloud.store))
  const archiveRef = useRef<Archive | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [status, setStatus] = useState<SyncStatus>(cloud.status)
  const [imported, setImported] = useState(false)
  const language = useSettingsLanguage(settings)
  const t = DICTS[language]
  useEffect(() => cloud.subscribe(setStatus), [cloud])
  const local = browserStorage()
  const existing = parse(local?.getItem(STORAGE_KEY) ?? null)
  const canImport = existing.kind === 'ok' && existing.data.documents.length > 0
  const importLocal = () => {
    if (existing.kind !== 'ok') return
    cloud.store.update((data) => {
      const ids = new Set(data.documents.map((doc) => doc.id))
      return { ...data, documents: [...data.documents, ...existing.data.documents.filter((doc) => !ids.has(doc.id))] }
    })
    setImported(true)
  }
  return <SettingsContext.Provider value={settings}>
    <Body stored={cloud.store} archiveRef={archiveRef} />
    <aside className="absolute right-3 top-3 z-50 flex max-w-sm flex-wrap items-center gap-2 rounded bg-desk/95 p-3 text-sm shadow-lg" aria-live="polite">
      {status === 'saving' && <span>{t.cloudSaving}</span>}
      {status === 'error' && <><span>{t.cloudError}</span><button className="underline" onClick={() => void cloud.retry()}>{t.cloudRetry}</button></>}
      {status === 'conflict' && <span>{t.cloudConflict}</span>}
      {canImport && !imported && <button className="underline" onClick={importLocal}>{t.importLocal}</button>}
      {imported && <span>{t.importDone}</span>}
      <button className="underline disabled:opacity-50" disabled={status !== 'saved' || signingOut} onClick={() => {
        setSigningOut(true)
        archiveRef.current?.flush()
        void cloud.waitForSave().then((saved) => { if (saved) onSignOut(); else setSigningOut(false) })
      }}>{t.authSignOut}</button>
    </aside>
  </SettingsContext.Provider>
}

function useSettingsLanguage(store: SettingsStore): Settings['language'] {
  const [language, setLanguage] = useState(store.get().language)
  useEffect(() => store.subscribe(() => setLanguage(store.get().language)), [store])
  return language
}

function Login({ session }: { session: AuthSession | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const t = DICTS[detectLanguage()]
  const submit = async (signup: boolean) => {
    if (!supabase) return
    setBusy(true); setMessage('')
    const result = signup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setMessage(result.error ? t.authError : signup && !result.data.session ? t.authCheckEmail : '')
  }
  return <main className="grid min-h-full place-items-center p-6">
    <form className="w-full max-w-md space-y-5 rounded-xl border border-paper/20 bg-desk p-8 shadow-xl" onSubmit={(event) => { event.preventDefault(); void submit(false) }}>
      <h1 className="font-display text-3xl">{t.authTitle}</h1><p>{t.authIntro}</p>
      {!supabase ? <p role="alert">{t.authConfig}</p> : <>
        <label className="block">{t.authEmail}<input className="mt-1 w-full rounded border border-paper/40 bg-transparent p-2" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <label className="block">{t.authPassword}<input className="mt-1 w-full rounded border border-paper/40 bg-transparent p-2" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <div className="flex gap-4"><button className="rounded bg-brass px-4 py-2 text-desk disabled:opacity-50" disabled={busy} type="submit">{t.authSignIn}</button><button className="underline" disabled={busy} type="button" onClick={() => void submit(true)}>{t.authSignUp}</button></div>
        {message && <p role="status">{message}</p>}
      </>}
      {session && <button type="button" onClick={() => void supabase?.auth.signOut()}>{t.authSignOut}</button>}
    </form>
  </main>
}

export function App() {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [ready, setReady] = useState(!supabase)
  const [loaded, setLoaded] = useState<{ userId: string; cloud: CloudArchive } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const t = DICTS[detectLanguage()]
  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let alive = true
    void client.auth.getSession().then(({ data }) => { if (alive) { setSession(data.session); setReady(true) } })
    const { data: subscription } = client.auth.onAuthStateChange((_event, next) => { if (alive) { setSession(next); setReady(true) } })
    return () => { alive = false; subscription.subscription.unsubscribe() }
  }, [])
  const userId = session?.user.id
  useEffect(() => {
    setLoaded(null); setError(false)
    if (!userId || !supabase) return
    let alive = true
    void openCloudStore(supabase, userId, browserStorage()).then((next) => { if (alive) setLoaded({ userId, cloud: next }); else next.store.dispose() }).catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [userId, attempt])
  if (!ready) return <p role="status">{t.loading}</p>
  if (!session) return <Login session={null} />
  if (error) return <main className="grid min-h-full place-items-center p-6"><div><p role="alert">{t.cloudLoadingError}</p><button className="underline" onClick={() => setAttempt((n) => n + 1)}>{t.cloudReload}</button><button className="ml-4 underline" onClick={() => void supabase?.auth.signOut()}>{t.authSignOut}</button></div></main>
  if (!loaded || loaded.userId !== userId) return <p role="status">{t.loading}</p>
  return <AccountDesk key={userId} cloud={loaded.cloud} onSignOut={() => void supabase?.auth.signOut()} />
}
