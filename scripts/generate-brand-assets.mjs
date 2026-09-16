// Generates every logo, favicon and icon from the traced S-chevron mark.
// Run with `npm run brand:assets`. Outputs are committed, so this only needs
// re-running when the mark or wordmark changes.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import opentype from 'opentype.js'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = (...p) => path.join(root, ...p)

const NAVY = '#0B1F44'
const BLUE = '#006CFF'
const WHITE = '#FFFFFF'

// Mark traced from design/00-brand.jpeg (4x crop space). Bounds: x 40–740, y 38–712.
const MARK = {
  x: 40,
  y: 38,
  w: 700,
  h: 674,
  top: 'M468 38V185L190 314Q164 328 188 338L334 404Q346 411 332 418L246 462Q232 469 216 465L62 428Q40 422 40 400V270Q40 240 68 226Z',
  chevron:
    'M292 322L452 246Q466 240 482 246L718 346Q740 356 740 380V470Q740 492 720 506L446 704Q434 712 418 712H236L588 450Q600 440 586 434Z',
  bar: 'M40 606L420 440Q436 434 452 434H500Q518 436 502 448L66 710Q40 722 40 692Z',
}

const loadFont = (weight) => {
  const file = require.resolve(
    `@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-${weight}-normal.woff`,
  )
  const buf = fs.readFileSync(file)
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}
const fontBold = loadFont(800)
const fontTag = loadFont(600)

/** Outlined text path, returned with its bounding box. */
function textPath(font, text, size, x, baseline, letterSpacing = 0) {
  // Manual layout: opentype.js's shaper fails on this font's GSUB tables, and the
  // strings are plain ASCII, so glyph lookup + kerning is all we need.
  const scale = size / font.unitsPerEm
  const p = new opentype.Path()
  let pen = x
  const glyphs = [...text].map((ch) => font.charToGlyph(ch))
  glyphs.forEach((g, i) => {
    p.extend(g.getPath(pen, baseline, size))
    pen += g.advanceWidth * scale + letterSpacing * size
    if (glyphs[i + 1]) pen += font.getKerningValue(g, glyphs[i + 1]) * scale
  })
  const bb = p.getBoundingBox()
  return { d: p.toPathData(2), bb }
}

const markGroup = (colors, tx, ty, scale) =>
  `<g transform="translate(${tx} ${ty}) scale(${scale}) translate(${-MARK.x} ${-MARK.y})">` +
  `<path fill="${colors.top}" d="${MARK.top}"/>` +
  `<path fill="${colors.rest}" d="${MARK.chevron}"/>` +
  `<path fill="${colors.rest}" d="${MARK.bar}"/></g>`

const svgDoc = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}"${extra}>${body}</svg>\n`
const fmt = (n) => Number(n.toFixed(2))

// ---- Lockups ---------------------------------------------------------------
// Proportions measured from the brand sheet: mark height 170px, cap height ~108px,
// gap ~30px, baseline ~88% down the mark.
const MARK_H = 100
const markScale = MARK_H / MARK.h
const markW = MARK.w * markScale
const capRatio = fontBold.tables.os2.sCapHeight / fontBold.unitsPerEm
const fontSize = (MARK_H * 0.64) / capRatio
const gap = MARK_H * 0.17
const baseline = MARK_H * 0.84

function horizontal(textColor, markColors, withTagline) {
  const word = textPath(fontBold, 'SiteRun', fontSize, 0, baseline, -0.02)
  const wx = markW + gap - word.bb.x1
  const word2 = textPath(fontBold, 'SiteRun', fontSize, wx, baseline, -0.02)
  let width = word2.bb.x2 + 2
  let height = MARK_H
  let body = markGroup(markColors, 0, 0, markScale) + `<path fill="${textColor}" d="${word2.d}"/>`
  if (withTagline) {
    const wordWidth = word2.bb.x2 - word2.bb.x1
    const probe = textPath(fontTag, 'Machines. People. Progress.', 100, 0, 0, 0.02)
    const tagSize = (100 * wordWidth) / (probe.bb.x2 - probe.bb.x1)
    const tagBase = MARK_H + tagSize * 0.62
    const tag0 = textPath(fontTag, 'Machines. People. Progress.', tagSize, 0, tagBase, 0.02)
    const tag = textPath(fontTag, 'Machines. People. Progress.', tagSize, word2.bb.x1 - tag0.bb.x1, tagBase, 0.02)
    body += `<path fill="${textColor}" d="${tag.d}"/>`
    height = Math.max(height, tag.bb.y2 + 2)
    width = Math.max(width, tag.bb.x2 + 2)
  }
  return { svg: svgDoc(width, height, body), wordX: wx, width, height, wordD: word2.d }
}

const brandDir = out('public', 'brand')
fs.mkdirSync(brandDir, { recursive: true })
const write = (name, data) => {
  fs.writeFileSync(path.join(brandDir, name), data)
  console.log('wrote public/brand/' + name)
}

const onLight = { top: BLUE, rest: NAVY }
const onDark = { top: BLUE, rest: WHITE }

const markSvg = svgDoc(MARK.w, MARK.h, markGroup(onLight, 0, 0, 1))
write('logo-mark.svg', markSvg)
write('logo-mark-white.svg', svgDoc(MARK.w, MARK.h, markGroup(onDark, 0, 0, 1)))
const hLight = horizontal(NAVY, onLight, false)
write('logo-horizontal.svg', hLight.svg)
const hDark = horizontal(WHITE, onDark, false)
write('logo-horizontal-white.svg', hDark.svg)
write('logo-lockup-tagline.svg', horizontal(NAVY, onLight, true).svg)
write('logo-lockup-tagline-white.svg', horizontal(WHITE, onDark, true).svg)

// App icon: navy rounded square, blue top stroke, white lower strokes (brand sheet).
const ICON = 1024
const iconMarkScale = (ICON * 0.6) / MARK.h
const iconMark = (size, scale) =>
  markGroup(
    onDark,
    (size - MARK.w * scale) / 2 + size * 0.01,
    (size - MARK.h * scale) / 2,
    scale,
  )
const appIconSvg = svgDoc(
  ICON,
  ICON,
  `<rect width="${ICON}" height="${ICON}" rx="224" fill="${NAVY}"/>` + iconMark(ICON, iconMarkScale),
)
write('app-icon.svg', appIconSvg)
// Full-bleed variant (no rounded corners) — source for iOS/Android store icons.
const appIconFullSvg = svgDoc(
  ICON,
  ICON,
  `<rect width="${ICON}" height="${ICON}" fill="${NAVY}"/>` + iconMark(ICON, iconMarkScale),
)
write('app-icon-full.svg', appIconFullSvg)

// ---- Favicons --------------------------------------------------------------
const pub = out('public')
const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' })
    .render()
    .asPng()

// Square, padded mark. Navy strokes flip to white when the browser UI is dark.
const pad = 40
const sq = MARK.w + pad * 2
const favSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sq} ${sq}">` +
  `<style>.n{fill:${NAVY}}@media (prefers-color-scheme:dark){.n{fill:${WHITE}}}</style>` +
  `<g transform="translate(${pad} ${pad + (MARK.w - MARK.h) / 2}) translate(${-MARK.x} ${-MARK.y})">` +
  `<path fill="${BLUE}" d="${MARK.top}"/><path class="n" d="${MARK.chevron}"/><path class="n" d="${MARK.bar}"/></g></svg>\n`
fs.writeFileSync(path.join(pub, 'favicon.svg'), favSvg)
const favStatic = favSvg.replace(/<style>.*<\/style>/, '').replaceAll('class="n"', `fill="${NAVY}"`)

const icoPngs = await Promise.all([16, 32, 48].map((s) => render(favStatic, s)))
fs.writeFileSync(path.join(pub, 'favicon.ico'), await pngToIco(icoPngs))

const writePng = async (name, svg, size) => {
  await sharp(render(svg, size)).png().toFile(path.join(pub, name))
  console.log('wrote public/' + name)
}
// iOS fills transparency with black, so touch/PWA icons use the opaque app icon.
await writePng('apple-touch-icon.png', appIconFullSvg, 180)
await writePng('icon-192.png', appIconSvg, 192)
await writePng('icon-512.png', appIconSvg, 512)
const maskableSvg = svgDoc(
  ICON,
  ICON,
  `<rect width="${ICON}" height="${ICON}" fill="${NAVY}"/>` + iconMark(ICON, (ICON * 0.46) / MARK.h),
)
await writePng('icon-maskable-512.png', maskableSvg, 512)

fs.writeFileSync(
  path.join(pub, 'site.webmanifest'),
  JSON.stringify(
    {
      name: 'SiteRun',
      short_name: 'SiteRun',
      description: 'Construction equipment hire. Machines. People. Progress.',
      start_url: '/',
      display: 'standalone',
      background_color: NAVY,
      theme_color: NAVY,
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
)
console.log('wrote favicon.svg, favicon.ico, site.webmanifest')

// ---- Shared geometry for the React <Logo> component --------------------------
const genDir = out('src', 'components', 'brand')
fs.mkdirSync(genDir, { recursive: true })
fs.writeFileSync(
  path.join(genDir, 'logoPaths.generated.ts'),
  `// Generated by scripts/generate-brand-assets.mjs — do not edit by hand.
export const MARK_VIEWBOX = '${MARK.x} ${MARK.y} ${MARK.w} ${MARK.h}'
export const MARK_TOP = '${MARK.top}'
export const MARK_CHEVRON = '${MARK.chevron}'
export const MARK_BAR = '${MARK.bar}'
export const LOCKUP_WIDTH = ${fmt(hLight.width)}
export const LOCKUP_HEIGHT = ${fmt(hLight.height)}
export const LOCKUP_MARK_SCALE = ${fmt(markScale * 10000) / 10000}
export const WORDMARK_PATH = '${hLight.wordD}'
`,
)
console.log('wrote src/components/brand/logoPaths.generated.ts')
