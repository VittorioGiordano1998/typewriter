// Dev helper: exercises archive, settings, language and export in headless Chrome.
// Output goes to a new timestamped folder under the given directory.
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const root = process.argv[2] ?? '.tmp/features'
const out = path.resolve(root, new Date().toISOString().replace(/[:.]/g, '-'))
const dl = path.join(out, 'downloads')
fs.mkdirSync(dl, { recursive: true })
console.log('output in', out)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  defaultViewport: { width: 1440, height: 810 },
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
const cdp = await page.createCDPSession()
await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dl })

const label = (...names) => names.map((n) => `[aria-label^="${n}"]`).join(', ')
const click = async (...names) => {
  const el = await page.waitForSelector(label(...names), { timeout: 5000 })
  await el.click()
}
const session = () =>
  page.evaluate(() => {
    const s = window.__session.getState()
    return { id: s.doc.id, strikes: s.doc.pages.map((p) => p.strikes.length), cursor: s.cursor, ribbon: s.ribbon }
  })
const shot = (n) => page.screenshot({ path: path.join(out, n + '.png') })
const load = async () => {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
  await sleep(2500)
}
const type = async (t) => {
  for (const c of t) await page.keyboard.type(c, { delay: 20 })
}

// A clean slate: the first load only creates the origin's storage.
await load()
await page.evaluate(() => window.localStorage.removeItem('typewriter.v1'))
await load()
await type('Hello archive')
await sleep(900)
console.log('1 typed        ', JSON.stringify(await session()))
await load()
console.log('2 after reload ', JSON.stringify(await session()))

await click('Sheets', 'Fogli')
await sleep(400)
await shot('archive-1')
await page.click('button[data-autofocus]')
await sleep(400)
await type('second sheet')
await sleep(900)
console.log('3 second sheet ', JSON.stringify(await session()))
await click('Sheets', 'Fogli')
await sleep(300)
const items = await page.$$eval('[role="dialog"] li', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 90)))
console.log('4 list         ', JSON.stringify(items))
await shot('archive-2')
const renameButtons = await page.$$('[role="dialog"] li button[aria-label^="Rename"], [role="dialog"] li button[aria-label^="Rinomina"]')
await renameButtons[1].click()
await sleep(150)
await page.keyboard.type('Letter to Anna')
await page.keyboard.press('Enter')
await sleep(300)
const renamed = await page.$$eval('[role="dialog"] li', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').slice(0, 60)))
console.log('5 renamed      ', JSON.stringify(renamed))
await page.keyboard.press('Escape')
await sleep(200)
await type('!')
await sleep(200)
console.log('6 typed after close', JSON.stringify(await session()))

await click('Settings', 'Impostazioni')
await sleep(300)
await page.evaluate(() => {
  const groups = document.querySelectorAll('[role="dialog"] [role="radiogroup"]')
  groups[0].querySelectorAll('[role="radio"]')[1].click() // language: English
  groups[1].querySelectorAll('[role="radio"]')[1].click() // ribbon: red
})
await sleep(300)
await shot('settings')
await page.keyboard.press('Escape')
await sleep(200)
await type('RED')
await sleep(300)
console.log('7 ribbon       ', JSON.stringify(await session()))
console.log('  html lang    ', await page.evaluate(() => document.documentElement.lang))
await sleep(500)
await shot('red-ink')

for (const names of [['PNG'], ['PDF'], ['Plain']]) {
  await click('Export', 'Esporta')
  await sleep(300)
  const buttons = await page.$$('[role="dialog"] button:not([aria-label])')
  const texts = await Promise.all(buttons.map((b) => b.evaluate((e) => e.textContent)))
  const i = texts.findIndex((t) => names.some((n) => t.includes(n)))
  await buttons[i].click()
  await sleep(3000)
}
console.log('8 downloads    ', JSON.stringify(fs.readdirSync(dl).map((f) => [f, fs.statSync(path.join(dl, f)).size])))
const txt = fs.readdirSync(dl).find((f) => f.endsWith('.txt'))
if (txt) console.log('  txt content  ', JSON.stringify(fs.readFileSync(path.join(dl, txt), 'utf8')))

await click('Settings', 'Impostazioni')
await sleep(300)
await page.click('[role="dialog"] input[type="checkbox"]')
await sleep(300)
await page.keyboard.press('Escape')
await sleep(1200)
await shot('night')
console.log('errors:', JSON.stringify(errors))
await browser.close()
