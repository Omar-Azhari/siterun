// Builds docs/checkpoints/checkpoint-0-logos.png: brand-sheet crops (left) vs generated SVGs (right).
import fs from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

const board = 'design/00-brand.jpeg'
const r = (file, w) =>
  new Resvg(fs.readFileSync(file, 'utf8'), { fitTo: { mode: 'width', value: w } }).render().asPng()
const crop = (l, t, w, h, outW) =>
  sharp(board)
    .extract({ left: l, top: t, width: w, height: h })
    .resize({ width: outW })
    .png()
    .toBuffer()

const rows = [
  ['Primary logo', await crop(50, 120, 710, 200, 620), r('public/brand/logo-horizontal.svg', 620)],
  ['Icon only', await crop(885, 120, 215, 200, 240), r('public/brand/logo-mark.svg', 240)],
  ['App icon', await crop(1235, 95, 255, 250, 250), r('public/brand/app-icon.svg', 250)],
  [
    'Tagline lockup',
    await crop(90, 440, 560, 150, 620),
    r('public/brand/logo-lockup-tagline.svg', 620),
  ],
]
const W = 1400
let y = 70
const comps = []
const label = (text, x, yy, size = 28, weight = 700) =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${size + 16}"><text x="${x}" y="${size}" font-family="Segoe UI, Arial" font-size="${size}" font-weight="${weight}" fill="#0B1F44">${text}</text></svg>`,
  )
comps.push({ input: label('Brand sheet (design/00-brand.jpeg)', 40, 0, 26), left: 0, top: 20 })
comps.push({ input: label('Generated SVG (public/brand)', 740, 0, 26), left: 0, top: 20 })
for (const [name, a, b] of rows) {
  const ma = await sharp(a).metadata()
  const mb = await sharp(b).metadata()
  comps.push({ input: label(name, 40, 0, 20, 600), left: 0, top: y })
  y += 36
  comps.push({ input: a, left: 40, top: y })
  comps.push({ input: b, left: 740, top: y })
  y += Math.max(ma.height, mb.height) + 40
}
// Dark header variant, as used in the app.
const dark = r('public/brand/logo-horizontal-white.svg', 300)
const dm = await sharp(dark).metadata()
comps.push({
  input: label('App header variant (logo-horizontal-white.svg on --bg-app)', 40, 0, 20, 600),
  left: 0,
  top: y,
})
y += 36
comps.push({
  input: await sharp({
    create: { width: 620, height: dm.height + 60, channels: 3, background: '#011020' },
  })
    .png()
    .toBuffer(),
  left: 740,
  top: y,
})
comps.push({ input: dark, left: 740 + 160, top: y + 30 })
comps.push({
  input: await sharp('design/01-entry-account.jpeg')
    .extract({ left: 1265, top: 295, width: 110, height: 36 })
    .resize({ width: 330 })
    .png()
    .toBuffer(),
  left: 40,
  top: y + 10,
})
y += dm.height + 100
await sharp({ create: { width: W, height: y, channels: 3, background: '#F4F7FB' } })
  .composite(comps)
  .png()
  .toFile('docs/checkpoints/checkpoint-0-logos.png')
console.log('ok')
