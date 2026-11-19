import { useEffect, useState } from 'react'
import { pageToText } from '../../core/export-text'
import type { Session } from './session'

function textOf(session: Session): string {
  const { doc, cursor } = session.getState()
  return pageToText(doc.pages[cursor.page] ?? doc.pages[0])
}

/**
 * The text of the sheet in the machine, refreshed a moment after typing pauses. Screen readers
 * and the no-WebGL fallback read this; the delay keeps it from being rebuilt on every keystroke.
 */
export function useSheetText(session: Session, delayMs = 350): string {
  const [text, setText] = useState(() => textOf(session))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const update = () => {
      timer = null
      setText(textOf(session))
    }
    const off = session.subscribe(() => {
      timer ??= setTimeout(update, delayMs)
    })
    update()
    return () => {
      off()
      if (timer !== null) clearTimeout(timer)
    }
  }, [session, delayMs])
  return text
}
