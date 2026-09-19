/** Photos in public/images: `name.webp` is 1200px wide, `name-sm.webp` 480px. */
export const img = (name: string) => `/images/${name}.webp`
export const imgSm = (name: string) => `/images/${name}-sm.webp`

/** Small version of a photo: bundled photos have a `-sm` file, uploaded ones don't. */
export const thumb = (url: string | null | undefined) =>
  url && url.startsWith('/images/') ? url.replace('.webp', '-sm.webp') : (url ?? undefined)
