/**
 * Draws a sheet to a 2D canvas for export. It uses the same ink function as the 3D scene
 * (`inkFor`) and the same light-absorbing model, so a PNG or PDF looks like the screen.
 */
import { inkFor, mulberry32, RIBBON_COLOR } from '../../core/ink'
import {
  CHAR_WIDTH_MM,
  LINE_HEIGHT_MM,
  MARGIN_LEFT_MM,
  MARGIN_TOP_MM,
  PAGE_HEIGHT_MM,
  PAGE_WIDTH_MM,
  type Page,
} from '../../core/page'

const PAPER = '#f3ead6'
const FONT = '"Courier Prime", "Courier New", monospace'

export async function ensureFontsLoaded(): Promise<void> {
  try {
    await document.fonts.load(`400 40px ${FONT}`)
  } catch {
    // The system monospace font will do.
  }
}

export function renderPage(page: Page, dpi: number): HTMLCanvasElement {
  const mm = dpi / 25.4
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(PAGE_WIDTH_MM * mm)
  canvas.height = Math.round(PAGE_HEIGHT_MM * mm)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas is not available')

  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // A faint grain, so the sheet is not a flat colour.
  const grain = mulberry32(0x5eed)
  ctx.globalAlpha = 0.05
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = grain() > 0.5 ? '#8a7650' : '#fff8e4'
    ctx.fillRect(grain() * canvas.width, grain() * canvas.height, 1 + grain() * 2.5, 1)
  }
  ctx.globalAlpha = 1

  // One em is the line pitch (1/6 inch, 12 pt); Courier's advance is 0.6 em = 1/10 inch.
  const em = LINE_HEIGHT_MM * mm
  ctx.font = `400 ${em}px ${FONT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText('M')
  const asc = m.fontBoundingBoxAscent ?? em * 0.8
  const desc = m.fontBoundingBoxDescent ?? em * 0.25
  const baseline = (asc - desc) / 2

  const cw = CHAR_WIDTH_MM * mm
  const ch = LINE_HEIGHT_MM * mm
  const ml = MARGIN_LEFT_MM * mm
  const mt = MARGIN_TOP_MM * mm
  ctx.globalCompositeOperation = 'multiply'

  for (const s of page.strikes) {
    const ink = inkFor(s.char, s.seed)
    const variation = 0.78 + mulberry32(s.seed ^ 0x9e3779b9)() * 0.5
    ctx.globalAlpha = Math.min(1, ink.density * variation)
    ctx.fillStyle = RIBBON_COLOR[s.ribbon]
    ctx.save()
    ctx.translate(ml + (s.col + 0.5) * cw + ink.dx * cw, mt + (s.row + 0.5) * ch - ink.dy * cw)
    ctx.rotate(-ink.rot)
    ctx.scale(ink.scale, ink.scale)
    ctx.fillText(s.char, 0, baseline)
    ctx.restore()
  }
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  return canvas
}
