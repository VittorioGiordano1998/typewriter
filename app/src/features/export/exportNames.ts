import type { Page, TypewriterDocument } from '../../core/page'

/** A safe download name: the title (or "typewriter") plus the date, with no path characters. */
export function exportFileName(title: string, now: number, extension: string, suffix = ''): string {
  const d = new Date(now)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const base =
    title
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'typewriter'
  return `${base}-${date}${suffix}.${extension}`
}

/** Pages worth printing: everything up to the last page with a strike (at least the first). */
export function printablePages(doc: TypewriterDocument): readonly Page[] {
  let last = 0
  doc.pages.forEach((p, i) => {
    if (p.strikes.length > 0) last = i
  })
  return doc.pages.slice(0, last + 1)
}
