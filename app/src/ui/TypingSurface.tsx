import { useEffect, useRef } from 'react'
import { useI18n } from '../features/i18n/context'
import { attachTypingInput } from '../features/session/inputController'
import { useSessionBundle } from '../features/session/SessionContext'
import { useSettingsStore } from '../features/settings/SettingsContext'

/**
 * The hidden <textarea> that receives all typing. It keeps focus: a click anywhere that is not a
 * control hands it back, so the keyboard always writes on the sheet.
 */
export function TypingSurface() {
  const ref = useRef<HTMLTextAreaElement>(null)
  const { session, input } = useSessionBundle()
  const { t } = useI18n()
  const settings = useSettingsStore()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const controller = attachTypingInput(el, session, {
      backspaceAction: () => (settings.get().backspace === 'move' ? { type: 'backspace' } : { type: 'crossOut' }),
    })
    input.set(controller)
    el.focus({ preventScroll: true })

    const isControl = (e: Event) =>
      !!(e.target as HTMLElement | null)?.closest('button, a, input, select, textarea, [role="dialog"], [data-keep-focus]')
    // A press on the desk must not take the keyboard away from the machine...
    const keepFocus = (e: MouseEvent) => {
      if (!isControl(e)) e.preventDefault()
    }
    // ...and a tap hands it back (this is also the gesture that raises a phone's soft keyboard).
    const refocus = (e: Event) => {
      if (!isControl(e)) el.focus({ preventScroll: true })
    }
    const onWindowFocus = () => el.focus({ preventScroll: true })
    document.addEventListener('mousedown', keepFocus)
    document.addEventListener('click', refocus)
    window.addEventListener('focus', onWindowFocus)
    return () => {
      document.removeEventListener('mousedown', keepFocus)
      document.removeEventListener('click', refocus)
      window.removeEventListener('focus', onWindowFocus)
      controller.detach()
      input.set(null)
    }
  }, [session, input, settings])

  return (
    <textarea
      ref={ref}
      aria-label={t.typingSurfaceLabel}
      autoCapitalize="off"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      // 16px stops iOS from zooming the page on focus; the field is invisible and tiny.
      className="fixed left-0 top-0 h-px w-px resize-none border-0 bg-transparent p-0 text-base opacity-0 outline-none"
    />
  )
}
