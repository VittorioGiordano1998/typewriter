import { documentToText } from '../../core/export-text'
import type { TypewriterDocument } from '../../core/page'
import { exportFileName, printablePages } from './exportNames'
import { ensureFontsLoaded, renderPage } from './renderPage'

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Give the browser a moment to start the download before the URL goes away.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))), type, quality),
  )
}

export function exportTxt(doc: TypewriterDocument, title: string): void {
  const blob = new Blob([documentToText(doc)], { type: 'text/plain;charset=utf-8' })
  download(blob, exportFileName(title, Date.now(), 'txt'))
}

/** One sheet as an image: the one under the carriage unless another index is given. */
export async function exportPng(doc: TypewriterDocument, pageIndex: number, title: string): Promise<void> {
  await ensureFontsLoaded()
  const page = doc.pages[pageIndex] ?? doc.pages[0]
  const blob = await canvasToBlob(renderPage(page, 200), 'image/png')
  const suffix = doc.pages.length > 1 ? `-p${pageIndex + 1}` : ''
  download(blob, exportFileName(title, Date.now(), 'png', suffix))
}

/** Every sheet, one A4 page each. jsPDF is loaded only now: it is large and rarely needed. */
export async function exportPdf(doc: TypewriterDocument, title: string): Promise<void> {
  await ensureFontsLoaded()
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  printablePages(doc).forEach((page, i) => {
    if (i > 0) pdf.addPage('a4', 'portrait')
    const canvas = renderPage(page, 170)
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
  })
  pdf.setProperties({ title: title || 'Typewriter' })
  download(pdf.output('blob'), exportFileName(title, Date.now(), 'pdf'))
}
