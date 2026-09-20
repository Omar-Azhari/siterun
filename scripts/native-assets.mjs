// Renders the PNG sources @capacitor/assets needs from the brand SVGs.
import { readFileSync, mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const b64 = (p) => `data:image/svg+xml;base64,${readFileSync(p).toString('base64')}`
const icon = b64('public/brand/app-icon.svg')
const mark = b64('public/brand/logo-mark-white.svg')

const shots = [
  // Square app icon (navy tile with the mark), used for iOS and the Android legacy icon.
  { file: 'assets/icon-only.png', size: 1024, html: `<img src="${icon}" style="width:1024px;height:1024px">` },
  // Adaptive icon layers for Android.
  { file: 'assets/icon-foreground.png', size: 1024, html: `<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center"><img src="${mark}" style="width:560px"></div>` },
  { file: 'assets/icon-background.png', size: 1024, html: `<div style="width:1024px;height:1024px;background:#0B1F44"></div>` },
  // Splash: centred mark on navy.
  { file: 'assets/splash.png', size: 2732, html: `<div style="width:2732px;height:2732px;background:#0B1F44;display:flex;align-items:center;justify-content:center"><img src="${mark}" style="width:760px"></div>` },
  { file: 'assets/splash-dark.png', size: 2732, html: `<div style="width:2732px;height:2732px;background:#011020;display:flex;align-items:center;justify-content:center"><img src="${mark}" style="width:760px"></div>` },
]

mkdirSync('assets', { recursive: true })
const browser = await chromium.launch()
for (const s of shots) {
  const page = await browser.newPage({ viewport: { width: s.size, height: s.size }, deviceScaleFactor: 1 })
  await page.setContent(`<body style="margin:0;background:transparent">${s.html}</body>`)
  await page.screenshot({ path: s.file, omitBackground: s.file.includes('foreground') })
  await page.close()
  console.log(s.file)
}
await browser.close()
