import { useI18n } from '../features/i18n/context'
import { useSessionBundle } from '../features/session/SessionContext'
import { useSheetText } from '../features/session/useSheetText'

/** Shown when WebGL is unavailable: the same typewriter rules, drawn as a plain sheet of text. */
export function PlainSheet() {
  const { t } = useI18n()
  const { session } = useSessionBundle()
  const text = useSheetText(session, 60)
  return (
    <section className="mx-auto flex h-full max-w-3xl flex-col gap-3 overflow-y-auto px-4 pb-6 pt-20">
      <p className="text-center text-sm text-paper/70">{t.noWebGL}</p>
      <pre
        role="document"
        aria-label={t.textMirrorLabel}
        className="min-h-[60%] overflow-x-auto whitespace-pre rounded bg-paper p-5 font-type text-sm leading-6 text-[#1b1815] shadow-xl"
      >
        {text || t.hint}
      </pre>
    </section>
  )
}
