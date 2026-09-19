// Tiles screenshots into columns: node scripts/contact-sheet.mjs out.png a.png b.png ...
import sharp from 'sharp'
const [, , out, ...files] = process.argv
const W = 390,
  GAP = 16,
  MAXH = 1900
const imgs = []
for (const f of files) {
  const buf = await sharp(f).resize({ width: W }).png().toBuffer()
  const { height } = await sharp(buf).metadata()
  imgs.push({ buf, height })
}
// Greedy column packing.
const cols = [[]]
let h = 0
for (const im of imgs) {
  if (h + im.height > MAXH && cols.at(-1).length) {
    cols.push([])
    h = 0
  }
  cols.at(-1).push(im)
  h += im.height + GAP
}
const height = Math.max(...cols.map((c) => c.reduce((a, i) => a + i.height + GAP, 0))) + GAP
const comps = []
cols.forEach((c, x) => {
  let y = GAP
  for (const im of c) {
    comps.push({ input: im.buf, left: GAP + x * (W + GAP), top: y })
    y += im.height + GAP
  }
})
await sharp({
  create: { width: GAP + cols.length * (W + GAP), height, channels: 3, background: '#1b2533' },
})
  .composite(comps)
  .png()
  .toFile(out)
console.log(out, cols.length, 'cols')
