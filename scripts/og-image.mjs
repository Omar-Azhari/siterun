// Renders public/og-image.png (1200×630) for link previews.
import { readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const b64 = (path, type) => `data:${type};base64,${readFileSync(path).toString('base64')}`
const logo = b64('public/brand/logo-horizontal-white.svg', 'image/svg+xml')
const photo = b64('public/images/splash-excavator-frame.webp', 'image/webp')
const font = b64(
  'node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  'font/woff2',
)

const html = `<!doctype html><html><head><style>
@font-face { font-family: Jakarta; src: url(${font}) format('woff2'); font-weight: 200 800; }
* { margin: 0; box-sizing: border-box; }
body { width: 1200px; height: 630px; background: #011020; color: #fff; font-family: Jakarta, sans-serif; position: relative; overflow: hidden; }
.photo { position: absolute; inset: 0 0 0 480px; background: url(${photo}) center/cover; }
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, #011020 0%, #011020 40%, rgba(1,16,32,0.55) 70%, rgba(1,16,32,0.2) 100%); }
.content { position: absolute; left: 72px; top: 72px; bottom: 72px; width: 640px; display: flex; flex-direction: column; }
.logo { height: 56px; width: auto; align-self: flex-start; }
h1 { margin-top: auto; font-size: 84px; line-height: 1.02; font-weight: 800; letter-spacing: -0.02em; }
h1 span { color: #006CFF; }
p { margin-top: 24px; font-size: 28px; color: #dae4ef; font-weight: 500; }
</style></head><body>
<div class="photo"></div><div class="shade"></div>
<div class="content">
  <img class="logo" src="${logo}" alt="">
  <h1>Keep projects <span>moving.</span></h1>
  <p>Construction equipment hire across Australia.</p>
</div>
</body></html>`

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
await page.setContent(html, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: 'public/og-image.png' })
await browser.close()
console.log('public/og-image.png written')
