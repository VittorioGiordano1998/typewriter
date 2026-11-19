import { type Page, type TypewriterDocument } from './page'

/**
 * Plain-text rendering of a document. Overstruck cells keep the last character typed; trailing
 * spaces are trimmed; pages are separated by a form feed.
 */
export function pageToText(page: Page): string {
  const rows = new Map<number, string[]>()
  let lastRow = -1
  for (const s of page.strikes) {
    let line = rows.get(s.row)
    if (!line) rows.set(s.row, (line = []))
    line[s.col] = s.char
    if (s.row > lastRow) lastRow = s.row
  }
  const out: string[] = []
  for (let r = 0; r <= lastRow; r++) {
    const line = rows.get(r)
    if (!line) {
      out.push('')
      continue
    }
    let text = ''
    for (let c = 0; c < line.length; c++) text += line[c] ?? ' '
    out.push(text.replace(/\s+$/, ''))
  }
  return out.join('\n')
}

export function documentToText(doc: TypewriterDocument): string {
  const pages = doc.pages.map(pageToText)
  // Drop trailing blank pages (a fresh sheet fed after the last return).
  while (pages.length > 1 && pages[pages.length - 1] === '') pages.pop()
  return pages.join('\f')
}
