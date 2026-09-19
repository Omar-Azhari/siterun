// Downloads the Unsplash photos listed in scripts/photos.json into public/images
// (WebP, 1200w + 480w) and regenerates CREDITS.md. Safe to re-run.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const root = path.resolve(import.meta.dirname, '..')
const photos = JSON.parse(fs.readFileSync(path.join(root, 'scripts/photos.json'), 'utf8'))
const outDir = path.join(root, 'public/images')
fs.mkdirSync(outDir, { recursive: true })

for (const p of photos) {
  const large = path.join(outDir, `${p.name}.webp`)
  const small = path.join(outDir, `${p.name}-sm.webp`)
  if (fs.existsSync(large) && fs.existsSync(small)) continue
  const url = `https://images.unsplash.com/photo-${p.id}?w=1400&q=80&fm=jpg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${p.name}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await sharp(buf)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(large)
  await sharp(buf)
    .resize({ width: 480, withoutEnlargement: true })
    .webp({ quality: 70 })
    .toFile(small)
  console.log('saved', p.name)
}

const rows = photos
  .map(
    (p) =>
      `| \`${p.name}\` | ${p.use} | [${p.author}](https://unsplash.com/@${p.user}) | [unsplash.com/photos/${p.slug}](https://unsplash.com/photos/${p.slug}) |`,
  )
  .join('\n')

fs.writeFileSync(
  path.join(root, 'CREDITS.md'),
  `# Credits

## Photos

All photos are from [Unsplash](https://unsplash.com) and used under the
[Unsplash License](https://unsplash.com/license) (free for commercial use, no
permission needed). Attribution is given here as a courtesy. Files live in
\`public/images/\` as \`<name>.webp\` (1200px) and \`<name>-sm.webp\` (480px) and
are regenerated with \`node scripts/fetch-photos.mjs\`.

| File | Used for | Photographer | Source |
|---|---|---|---|
${rows}

## Other assets

- Icons: [Lucide](https://lucide.dev) (ISC License)
- Fonts: [Inter](https://rsms.me/inter/) and [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans) (SIL Open Font License), self-hosted through Fontsource
- Maps: Esri World Imagery, World Street Map and Dark Gray Canvas (© Esri, Maxar, Earthstar Geographics, HERE, Garmin, © OpenStreetMap contributors); geocoding by [Photon](https://photon.komoot.io) on OpenStreetMap data
- Logo: traced from the SiteRun brand sheet (\`design/00-brand.jpeg\`)
`,
)
console.log('wrote CREDITS.md')
