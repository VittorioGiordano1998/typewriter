// Dev helper: checks in headless Chrome that every typewriter event makes the expected sound.
import puppeteer from 'puppeteer-core'
const chrome = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const browser = await puppeteer.launch({
  executablePath: chrome, headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=document-user-activation-required'],
  defaultViewport: { width: 1280, height: 720 },
})
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
await page.evaluateOnNewDocument(() => {
  window.__played = []
  const start = AudioBufferSourceNode.prototype.start
  AudioBufferSourceNode.prototype.start = function (...a) {
    window.__played.push({ dur: this.buffer ? +this.buffer.duration.toFixed(3) : null, rate: +this.playbackRate.value.toFixed(3), loop: this.loop })
    return start.apply(this, a)
  }
})
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' })
await sleep(2500)
const take = async (label, fn) => {
  await page.evaluate(() => (window.__played = []))
  await fn()
  await sleep(250)
  const played = await page.evaluate(() => window.__played)
  console.log(label.padEnd(22), JSON.stringify(played))
}
await take('strike a', () => page.keyboard.type('a'))
await take('strike b', () => page.keyboard.type('b'))
await take('space', () => page.keyboard.press('Space'))
await take('backspace', () => page.keyboard.press('Backspace'))
await take('return (col 2)', () => page.keyboard.press('Enter'))
await sleep(300)
await take('type to bell', async () => { for (let i = 0; i < 57; i++) await page.keyboard.type('x') })
await take('at margin (lock)', async () => { for (let i = 0; i < 12; i++) await page.keyboard.type('y') })
const state = await page.evaluate(() => window.__session.getState().cursor)
console.log('cursor', JSON.stringify(state))
await take('return (col 65)', () => page.keyboard.press('Enter'))
console.log('errors:', JSON.stringify(errors))
await browser.close()
