// Dev helper: runs a typing scenario in headless Chrome and reports the session state.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const out = process.argv[2] ?? '.tmp/scenario'
const url = 'http://localhost:5173/'
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
fs.mkdirSync(out, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1440, height: 810 },
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(url, { waitUntil: 'networkidle0' })
await sleep(2500)
const state = () => page.evaluate(() => {
  const s = window.__session.getState()
  return { cursor: s.cursor, strikes: s.doc.pages.map((p) => p.strikes.length), pages: s.doc.pages.length }
})
const shot = (n) => page.screenshot({ path: path.join(out, n + '.png') })
const type = async (t, delay = 25) => { for (const c of t) await page.keyboard.type(c, { delay }) }

await type('Dear diary,')
await page.keyboard.press('Enter'); await sleep(900)
await type('today the carriage moved.')
console.log('after 2 lines', JSON.stringify(await state()))
await page.keyboard.press('Enter'); await sleep(900)
await type('x'.repeat(70))            // fills the line and hits the margin lock
console.log('after long line', JSON.stringify(await state()))
await page.keyboard.press('Backspace'); await type('Q')   // overstrike
console.log('after overstrike', JSON.stringify(await state()))
await sleep(300)
await shot('1-lines')
await page.keyboard.press('Enter'); await sleep(200)
await shot('2-returning')
await sleep(1000)
await page.keyboard.press('Tab'); await type('tabbed')
console.log('after tab', JSON.stringify(await state()))
await sleep(400)
await shot('3-after-return')

// Fill the sheet: 54 returns feed a new page.
for (let i = 0; i < 52; i++) { await page.keyboard.press('Enter'); await sleep(40) }
await sleep(11000)
console.log('after many returns', JSON.stringify(await state()))
await shot('4-new-sheet')
await type('page two')
await sleep(1500)
console.log('after page two', JSON.stringify(await state()))
await shot('5-page-two')
console.log('errors:', JSON.stringify(errors))
await browser.close()
