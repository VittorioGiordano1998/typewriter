import { useI18n } from '../features/i18n/context'
import { useSessionBundle } from '../features/session/SessionContext'
import { useSheetText } from '../features/session/useSheetText'

/** The sheet as plain text, for screen readers: the 3D scene has no text of its own. */
export function TextMirror() {
  const { t } = useI18n()
  const { session } = useSessionBundle()
  const text = useSheetText(session)
  return (
    <pre role="document" aria-label={t.textMirrorLabel} className="sr-only">
      {text || t.emptySheet}
    </pre>
  )
}
