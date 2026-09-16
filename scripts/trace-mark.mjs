// Dev helper: renders the traced mark over the brand-sheet crop for comparison.
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import fs from 'node:fs'
const [, , svgPath, cropPath, outPath] = process.argv
const svg = fs.readFileSync(svgPath, 'utf8')
const png = new Resvg(svg, { fitTo: { mode: 'width', value: 780 } }).render().asPng()
const crop = await sharp(cropPath).resize(780, 740).png().toBuffer()
const blended = await sharp(crop).composite([{ input: png, blend: 'difference' }]).png().toBuffer()
await sharp({ create: { width: 780 * 3 + 40, height: 740, channels: 3, background: '#ffffff' } })
  .composite([
    { input: crop, left: 0, top: 0 },
    { input: png, left: 800, top: 0 },
    { input: blended, left: 1600, top: 0 },
  ])
  .png()
  .toFile(outPath)
