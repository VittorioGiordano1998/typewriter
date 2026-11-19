// Dev helper: drives the running dev server in headless Chrome, types text and saves screenshots.
// Usage: node scripts/shot.mjs <out-dir> [url]    (env TEXT overrides the typed text)
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const out = process.argv[2] ?? '.tmp/shots'
const url = process.argv[3] ?? 'http://localhost:5173/'
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1440,810'],
  defaultViewport: { width: 1440, height: 810, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
page.on('console', (m) => {
  const t = m.text()
  if (!/vite|DevTools|deprecated|PCFSoft/.test(t)) console.log('[console]', m.type(), t)
})
page.on('pageerror', (e) => console.log('[pageerror]', e.message))
await page.goto(url, { waitUntil: 'networkidle0' })
await sleep(2500)
const shot = (name) => page.screenshot({ path: path.join(out, name + '.png') })
const zoom = async (n, label) => {
  for (let i = 0; i < Math.abs(n); i++) await page.click(n > 0 ? 'button[aria-label="Farther"], button[aria-label="Più lontano"]' : 'button[aria-label="Closer"], button[aria-label="Più vicino"]')
  await sleep(1500)
  if (label) await shot(label)
}

await shot('00-initial')
for (const ch of process.env.TEXT ?? 'The quick brown fox') await page.keyboard.type(ch, { delay: 30 })
await sleep(500)
await shot('01-typed')

// A strike frozen mid-flight: slow the machine to 4% and hold a key.
await page.evaluate(() => (window.__timeScale = 0.04))
await page.keyboard.down('j')
await sleep(900)
await shot('02-strike-mid')
await page.keyboard.up('j')
await page.evaluate(() => (window.__timeScale = 1))
await sleep(600)

await zoom(2, '03-mid')
await zoom(3, '04-far')
await browser.close()
console.log('done')
