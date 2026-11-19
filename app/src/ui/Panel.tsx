import { useEffect, useRef, type ReactNode } from 'react'
import { useI18n } from '../features/i18n/context'
import { useSessionBundle } from '../features/session/SessionContext'
import { CloseIcon } from './icons'

interface Props {
  title: string
  onClose(): void
  /** Where the panel sits. */
  placement?: 'left' | 'center'
  children: ReactNode
}

/**
 * A modal panel over the scene. Escape or a click outside closes it, and the keyboard goes back
 * to the typewriter afterwards, so you can keep writing.
 */
export function Panel({ title, onClose, placement = 'left', children }: Props) {
  const { t } = useI18n()
  const { input } = useSessionBundle()
  const content = useRef<HTMLDivElement>(null)

  useEffect(() => {
    content.current?.querySelector<HTMLElement>('[data-autofocus], button, input, select')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      input.get()?.focus()
    }
  }, [onClose, input])

  const position =
    placement === 'left'
      ? 'left-0 top-0 h-full w-[min(22rem,100%)] border-r'
      : 'left-1/2 top-1/2 max-h-[90%] w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border'

  return (
    <div className="absolute inset-0 z-20" data-keep-focus>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute flex flex-col overflow-hidden border-white/10 bg-[#17130f]/95 text-paper shadow-2xl backdrop-blur ${position}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="font-display text-xl">{title}</h2>
          <button
            type="button"
            aria-label={t.close}
            title={t.close}
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-brass"
          >
            <CloseIcon />
          </button>
        </div>
        <div ref={content} className="min-h-0 flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
