/**
 * Turns keyboard input into typewriter actions. Input arrives through a focused, visually hidden
 * <textarea> using `beforeinput`, so accents, dead keys and Android's soft keyboard all take one
 * path. The carriage is busy while it returns or a sheet feeds: keystrokes typed meanwhile are
 * queued and replayed in order, as a typist would simply wait.
 */
import type { Action, TypewriterEvent } from '../../core/carriage'
import type { Session } from './session'
import { PAGE_FEED_MS, returnDurationMs } from './timing'

export interface InputController {
  /** Types an action programmatically (on-screen controls, tests). */
  send(action: Action): void
  /** Hands the keyboard back to the typewriter (after a dialog closes). */
  focus(): void
  detach(): void
}

function busyMs(events: readonly TypewriterEvent[]): number {
  let ms = 0
  for (const e of events) {
    if (e.type === 'return') ms = Math.max(ms, returnDurationMs(e.from))
    if (e.type === 'pageFull') ms = Math.max(ms, PAGE_FEED_MS)
  }
  return ms
}

export interface InputOptions {
  /** What Backspace sends, read at each press so a settings change applies at once. */
  readonly backspaceAction?: () => Action
}

export function attachTypingInput(el: HTMLTextAreaElement, session: Session, options: InputOptions = {}): InputController {
  const backspace = options.backspaceAction ?? ((): Action => ({ type: 'backspace' }))
  const queue: Action[] = []
  let busyUntil = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    timer = null
    while (queue.length > 0) {
      const now = performance.now()
      if (now < busyUntil) {
        timer = setTimeout(flush, busyUntil - now)
        return
      }
      const action = queue.shift()
      if (action) run(action)
    }
  }

  const run = (action: Action) => {
    const events = session.dispatch(action)
    const ms = busyMs(events)
    if (ms > 0) busyUntil = performance.now() + ms
  }

  const send = (action: Action) => {
    if (queue.length === 0 && performance.now() >= busyUntil) {
      run(action)
      return
    }
    queue.push(action)
    if (timer === null) timer = setTimeout(flush, Math.max(0, busyUntil - performance.now()))
  }

  const sendText = (text: string) => {
    for (const ch of text) {
      if (ch === '\n' || ch === '\r') send({ type: 'return' })
      else if (ch === '\t') send({ type: 'tab' })
      else if (ch === ' ' || ch === ' ') send({ type: 'space' })
      else if (ch >= ' ' && ch !== '\u007f') send({ type: 'char', char: ch })
    }
  }

  const clear = () => {
    el.value = ''
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return
    switch (e.key) {
      case 'Enter':
        e.preventDefault()
        if (!e.repeat) send({ type: 'return' })
        return
      case 'Backspace':
        e.preventDefault()
        send(backspace())
        return
      case 'Tab':
        e.preventDefault()
        if (!e.repeat) send({ type: 'tab' })
        return
      default:
        // A typebar does not auto-repeat; the space bar does.
        if (e.repeat && e.key.length === 1 && e.key !== ' ') e.preventDefault()
    }
  }

  const onBeforeInput = (e: InputEvent) => {
    if (e.isComposing) return
    switch (e.inputType) {
      case 'insertText':
        e.preventDefault()
        if (e.data) sendText(e.data)
        return
      case 'insertLineBreak':
      case 'insertParagraph':
        e.preventDefault()
        send({ type: 'return' })
        return
      case 'deleteContentBackward':
        e.preventDefault()
        send(backspace())
        return
      case 'insertFromPaste':
        e.preventDefault()
        return
    }
  }

  // Dead keys and IME composition: the finished text arrives on compositionend.
  const onCompositionEnd = (e: CompositionEvent) => {
    if (e.data) sendText(e.data)
    clear()
  }

  const onInput = () => clear()

  el.addEventListener('keydown', onKeyDown)
  el.addEventListener('beforeinput', onBeforeInput)
  el.addEventListener('compositionend', onCompositionEnd)
  el.addEventListener('input', onInput)

  return {
    send,
    focus() {
      el.focus({ preventScroll: true })
    },
    detach() {
      el.removeEventListener('keydown', onKeyDown)
      el.removeEventListener('beforeinput', onBeforeInput)
      el.removeEventListener('compositionend', onCompositionEnd)
      el.removeEventListener('input', onInput)
      if (timer !== null) clearTimeout(timer)
      queue.length = 0
    },
  }
}
