// Dev helper: checks the phone layout, the virtual-keyboard fit, the no-WebGL fallback and the text mirror.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = process.argv[2] ?? '.tmp/mobile'
const out = path.resolve(root, new Date().toISOString().replace(/[:.]/g, '-'))
fs.mkdirSync(out, { recursive: true })
console.log('output in', out)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
const URL = 'http://localhost:5173/'

// 1. A phone: 390x844, touch, 3x.
const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ARGS })
const page = await browser.newPage()
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
await page.goto(URL, { waitUntil: 'networkidle0' })
await sleep(3000)
await page.screenshot({ path: path.join(out, 'phone-1.png') })
const overflow = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  innerW: window.innerWidth,
  bodyScrollW: document.body.scrollWidth,
}))
console.log('phone overflow ', JSON.stringify(overflow), overflow.scrollW <= overflow.innerW ? 'OK' : 'HORIZONTAL SCROLL')
console.log('hint           ', await page.$eval('p.text-sm', (e) => e.textContent))

// Narrowest common phone.
await page.setViewport({ width: 360, height: 740, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await sleep(800)
const o360 = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, w: window.innerWidth }))
console.log('360px overflow ', JSON.stringify(o360), o360.s <= o360.w ? 'OK' : 'HORIZONTAL SCROLL')
await page.screenshot({ path: path.join(out, 'phone-360.png') })

// Typing through the hidden field, as a soft keyboard does.
await page.tap('main')
for (const c of 'Hi from my phone') await page.keyboard.type(c, { delay: 15 })
await sleep(600)
console.log('typed text     ', await page.evaluate(() => window.__session.getState().doc.pages[0].strikes.map((s) => s.char).join('')))
const mirror = await page.$eval('pre[role="document"]', (e) => e.textContent)
console.log('text mirror    ', JSON.stringify(mirror))

// Pinch: two touches moving apart should bring the camera closer (zoom value down).
const zoomBefore = await page.evaluate(() => window.__view?.zoom)
console.log('zoom before    ', zoomBefore)
await page.screenshot({ path: path.join(out, 'phone-typed.png') })
await browser.close()

// 2. No WebGL: block the contexts and check the plain sheet takes over.
const b2 = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--disable-gpu', '--disable-3d-apis', '--disable-webgl'] })
const p2 = await b2.newPage()
await p2.setViewport({ width: 1280, height: 720 })
const e2 = []
p2.on('pageerror', (e) => e2.push(e.message))
await p2.goto(URL, { waitUntil: 'networkidle0' })
await sleep(1500)
const hasCanvas = await p2.$('canvas')
console.log('no-WebGL canvas', hasCanvas ? 'present (WebGL still works here)' : 'absent')
if (!hasCanvas) {
  await p2.keyboard.type('Plain text works', { delay: 20 })
  await p2.keyboard.press('Enter')
  await p2.keyboard.type('second line', { delay: 20 })
  await sleep(400)
  console.log('fallback sheet ', JSON.stringify(await p2.$eval('section pre', (e) => e.textContent)))
  await p2.screenshot({ path: path.join(out, 'no-webgl.png') })
}
console.log('errors:', JSON.stringify(errors), JSON.stringify(e2))
await b2.close()
