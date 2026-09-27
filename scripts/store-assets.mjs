// Store artwork that isn't a screenshot: Google Play's feature graphic and the
// 1024 App Store icon (which must have no transparency). Run with `npm run store:assets`;
// output lands in docs/store/. Screenshots come from `npm run store:shots`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = (...p) => path.join(root, 'docs', 'store', ...p)
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

const NAVY = '#0B1F44'
const DEEP = '#011020'

fs.mkdirSync(out(), { recursive: true })

/** The lockup, sized and placed on the brand's navy gradient. */
function featureGraphic() {
  const lockup = read('public/brand/logo-lockup-tagline-white.svg')
  // Strip the outer <svg> so it can be placed inside the canvas.
  const inner = lockup.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
  const viewBox = /viewBox="([^"]+)"/.exec(lockup)?.[1] ?? '0 0 600 200'
  const [, , vw, vh] = viewBox.split(/\s+/).map(Number)
  const scale = Math.min((1024 * 0.62) / vw, (500 * 0.52) / vh)
  const w = vw * scale
  const h = vh * scale

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.22" r="0.7">
      <stop offset="0" stop-color="#006CFF" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#006CFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#glow)"/>
  <g transform="translate(${(1024 - w) / 2} ${(500 - h) / 2}) scale(${scale})">${inner}</g>
</svg>`
}

const png = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng()

fs.writeFileSync(out('play-feature-graphic.png'), png(featureGraphic(), 1024))

// App Store icon: 1024 square, fully opaque (Apple rejects alpha).
await sharp(png(read('public/brand/app-icon-full.svg'), 1024))
  .flatten({ background: NAVY })
  .png()
  .toFile(out('app-store-icon-1024.png'))

// Play's own icon slot: 512 square, alpha allowed.
await sharp(png(read('public/brand/app-icon-full.svg'), 512))
  .png()
  .toFile(out('play-icon-512.png'))

console.log('Wrote docs/store/play-feature-graphic.png, app-store-icon-1024.png, play-icon-512.png')
