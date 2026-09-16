// Mockup crop (left) vs component screenshot (right) for checkpoint 1.
import sharp from 'sharp'
const D = 'docs/checkpoints/checkpoint-1'
const crop = (f, l, t, w, h) => sharp(`design/${f}`).extract({ left: l, top: t, width: w, height: h })
const shot = (f, top, bottom) => async () => {
  const img = sharp(`${D}/${f}`); const m = await img.metadata()
  return sharp(`${D}/${f}`).extract({ left: 0, top: Math.round(m.height * top), width: m.width, height: Math.round(m.height * (bottom - top)) })
}
const rows = [
  ['Buttons (board 04)', crop('04-active-hire.jpeg', 265, 730, 215, 140), shot('03-buttons.png', 0.08, 0.5)],
  ['Split tabs + joined tabs (04, 07)', crop('04-active-hire.jpeg', 30, 370, 210, 45), shot('07-tabs.png', 0.1, 0.7)],
  ['Selectable options (04)', crop('04-active-hire.jpeg', 740, 535, 205, 160), shot('05-selectable.png', 0.55, 0.78)],
  ['Stat tiles (10)', crop('10-supplier-admin.jpeg', 30, 325, 210, 150), shot('12-stats.png', 0.05, 0.53)],
  ['Timeline (04)', crop('04-active-hire.jpeg', 505, 640, 210, 200), shot('13-timeline.png', 0.1, 1)],
  ['Toggles (07)', crop('07-add-machine.jpeg', 1205, 645, 215, 165), shot('10-toggles.png', 0.08, 0.5)],
  ['OTP (01)', crop('01-entry-account.jpeg', 975, 425, 210, 110), shot('11-otp.png', 0.1, 0.4)],
  ['Week strip (09)', crop('09-review-go-live.jpeg', 965, 380, 220, 250), shot('14-calendars.png', 0.02, 0.33)],
  ['Success (03)', crop('03-browse-book.jpeg', 1210, 305, 215, 200), shot('16-success.png', 0.08, 0.8)],
]
const W = 380, GAP = 20
const comps = []; let y = GAP
for (const [label, a, bFn] of rows) {
  const A = await a.resize({ width: W }).png().toBuffer()
  const B = await (await bFn()).resize({ width: W }).png().toBuffer()
  const ha = (await sharp(A).metadata()).height, hb = (await sharp(B).metadata()).height
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2 + GAP}" height="24"><text x="0" y="17" font-family="Segoe UI, Arial" font-size="16" font-weight="700" fill="#e5ecf5">${label}</text></svg>`), left: GAP, top: y })
  y += 30
  comps.push({ input: A, left: GAP, top: y }, { input: B, left: GAP * 2 + W, top: y })
  y += Math.max(ha, hb) + GAP * 1.5
}
await sharp({ create: { width: W * 2 + GAP * 3, height: Math.round(y), channels: 3, background: '#1b2533' } }).composite(comps.map((c) => ({ ...c, top: Math.round(c.top) }))).png().toFile(`${D}/mockup-vs-components.png`)
console.log('ok')
