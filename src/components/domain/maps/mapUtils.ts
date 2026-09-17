import L from 'leaflet'

export const TILES = {
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  labels: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: '',
    maxZoom: 19,
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  streets: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
} as const

export type TileKind = 'satellite' | 'dark' | 'streets'

/** Blue teardrop pin (board 02). */
export const pinIcon = L.divIcon({
  className: '',
  iconSize: [40, 52],
  iconAnchor: [20, 50],
  html: `<svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 51C20 51 38 31.5 38 19C38 9.06 29.94 1 20 1C10.06 1 2 9.06 2 19C2 31.5 20 51 20 51Z" fill="#006CFF" stroke="#fff" stroke-width="2"/>
    <circle cx="20" cy="19" r="7" fill="#fff"/></svg>`,
})

/** Round truck badge for live tracking (board 04). */
export const truckIcon = L.divIcon({
  className: '',
  iconSize: [64, 64],
  iconAnchor: [32, 32],
  html: `<div style="width:64px;height:64px;border-radius:9999px;background:rgba(0,108,255,.25);display:flex;align-items:center;justify-content:center">
    <div style="width:46px;height:46px;border-radius:9999px;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 3px #006CFF">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#006CFF" aria-hidden="true"><path d="M3 5h11v9H3zM14 8h4l3 3v3h-7zM6.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>
    </div></div>`,
})

export const dotIcon = (color: string) =>
  L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="width:22px;height:22px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.4)"></div>`,
  })

export const centreIcon = L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div style="width:26px;height:26px;border-radius:9999px;border:4px solid #fff;background:#006CFF;box-shadow:0 1px 6px rgba(0,0,0,.5)"></div>`,
})

/** Point along a polyline at fraction t (0–1). */
export function pointAlong(route: [number, number][], t: number): [number, number] {
  if (route.length === 0) return [0, 0]
  if (route.length === 1 || t <= 0) return route[0] as [number, number]
  if (t >= 1) return route[route.length - 1] as [number, number]
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1] as [number, number]
    const b = route[i] as [number, number]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    seg.push(d)
    total += d
  }
  let target = total * t
  for (let i = 0; i < seg.length; i++) {
    const d = seg[i] ?? 0
    if (target <= d) {
      const a = route[i] as [number, number]
      const b = route[i + 1] as [number, number]
      const f = d ? target / d : 0
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]
    }
    target -= d
  }
  return route[route.length - 1] as [number, number]
}
