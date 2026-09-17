// Builds docs/checkpoints/phase-2/board-XX-compare.png: the design board on top,
// the app's screenshots (390×844) in a row underneath.
// Usage: node scripts/compare-boards.mjs [01 02 ...]
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const OUT = 'docs/checkpoints/phase-2'
const IMAGES = {
  '01': '01-entry-account.jpeg',
  '02': '02-site-team-plans.jpeg',
  '03': '03-browse-book.jpeg',
  '04': '04-active-hire.jpeg',
  '05': '05-customer-ops.jpeg',
  '07': '07-add-machine.jpeg',
  '08': '08-compliance.jpeg',
  '09': '09-review-go-live.jpeg',
  10: '10-supplier-admin.jpeg',
}
const boards = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(IMAGES)

for (const b of boards) {
  const dir = path.join(OUT, `board-${b}`)
  if (!fs.existsSync(dir)) continue
  const shots = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort()
  const W = 1448
  const board = await sharp(`design/${IMAGES[b]}`).resize({ width: W }).png().toBuffer()
  const bh = (await sharp(board).metadata()).height
  const cols = shots.length
  const gap = 12
  const tw = Math.floor((W - gap * (cols + 1)) / cols)
  const tiles = await Promise.all(shots.map((f) => sharp(path.join(dir, f)).resize({ width: tw }).png().toBuffer()))
  const th = Math.max(...(await Promise.all(tiles.map(async (t) => (await sharp(t).metadata()).height))))
  const composite = [{ input: board, left: 0, top: 0 }]
  tiles.forEach((t, i) => composite.push({ input: t, left: gap + i * (tw + gap), top: bh + gap }))
  const out = path.join(OUT, `board-${b}-compare.png`)
  await sharp({ create: { width: W, height: bh + th + gap * 2, channels: 3, background: '#1b2533' } })
    .composite(composite)
    .png()
    .toFile(out)
  console.log('wrote', out)
}
