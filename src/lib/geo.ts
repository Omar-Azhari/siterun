// Geocoding helpers. Address autocomplete uses Photon (OpenStreetMap, free, no key)
// with an offline fallback so the app still works without network access.

export interface Place {
  label: string
  line1: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
}

const STATE_ABBR: Record<string, string> = {
  Victoria: 'VIC',
  'New South Wales': 'NSW',
  Queensland: 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  Tasmania: 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
}

export const MELBOURNE = { lat: -37.8136, lng: 144.9631 }

const LOCAL: Place[] = [
  ['Melbourne', 'VIC', '3000', -37.8136, 144.9631],
  ['Campbellfield', 'VIC', '3061', -37.6833, 144.9583],
  ['Geelong', 'VIC', '3220', -38.1499, 144.3617],
  ['Dandenong', 'VIC', '3175', -37.9874, 145.215],
  ['Tullamarine', 'VIC', '3043', -37.7, 144.88],
  ['Richmond', 'VIC', '3121', -37.823, 144.998],
  ['Brooklyn', 'VIC', '3012', -37.815, 144.842],
  ['Port Melbourne', 'VIC', '3207', -37.839, 144.94],
  ['Preston', 'VIC', '3072', -37.745, 145.0],
  ['Melton', 'VIC', '3337', -37.683, 144.583],
  ['Truganina', 'VIC', '3029', -37.82, 144.73],
  ['Epping', 'VIC', '3076', -37.65, 145.03],
  ['Frankston', 'VIC', '3199', -38.144, 145.126],
  ['Ballarat', 'VIC', '3350', -37.562, 143.85],
  ['Bendigo', 'VIC', '3550', -36.757, 144.279],
  ['Sydney', 'NSW', '2000', -33.8688, 151.2093],
  ['Parramatta', 'NSW', '2150', -33.815, 151.001],
  ['Brisbane', 'QLD', '4000', -27.4698, 153.0251],
  ['Gold Coast', 'QLD', '4217', -28.0167, 153.4],
  ['Adelaide', 'SA', '5000', -34.9285, 138.6007],
  ['Perth', 'WA', '6000', -31.9505, 115.8605],
  ['Hobart', 'TAS', '7000', -42.8821, 147.3272],
  ['Darwin', 'NT', '0800', -12.4634, 130.8456],
  ['Canberra', 'ACT', '2600', -35.2809, 149.13],
].map(([suburb, state, postcode, lat, lng]) => ({
  label: `${suburb}, ${state}`,
  line1: '',
  suburb: String(suburb),
  state: String(state),
  postcode: String(postcode),
  lat: Number(lat),
  lng: Number(lng),
}))

/** Offline lookup: "Melbourne, VIC" or "123 Construction Rd, Campbellfield VIC" → coordinates. */
export function geocodeLocal(text: string): { lat: number; lng: number } | null {
  const t = text.toLowerCase()
  const hit = [...LOCAL]
    .sort((a, b) => b.suburb.length - a.suburb.length)
    .find((p) => t.includes(p.suburb.toLowerCase()))
  return hit ? { lat: hit.lat, lng: hit.lng } : null
}

export function searchLocal(q: string): Place[] {
  const t = q.trim().toLowerCase()
  if (!t) return []
  return LOCAL.filter((p) => p.label.toLowerCase().includes(t) || p.postcode.startsWith(t)).slice(
    0,
    6,
  )
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
    locality?: string
    state?: string
    postcode?: string
    countrycode?: string
  }
}

function fromPhoton(f: PhotonFeature): Place | null {
  const p = f.properties
  if (p.countrycode && p.countrycode !== 'AU') return null
  const suburb = p.locality || p.district || p.city || p.name || ''
  const state = (p.state && STATE_ABBR[p.state]) || p.state || ''
  const street = [p.housenumber, p.street].filter(Boolean).join(' ')
  const line1 = street || (p.name && p.name !== suburb ? p.name : '')
  const [lng, lat] = f.geometry.coordinates
  const label = [line1, [suburb, state, p.postcode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  return { label, line1, suburb, state, postcode: p.postcode ?? '', lat, lng }
}

/** Address autocomplete biased to the given point (defaults to Melbourne). */
export async function searchAddress(
  q: string,
  near = MELBOURNE,
  signal?: AbortSignal,
): Promise<Place[]> {
  const query = q.trim()
  if (query.length < 3) return searchLocal(query)
  try {
    const url = new URL('https://photon.komoot.io/api/')
    url.searchParams.set('q', `${query}, Australia`)
    url.searchParams.set('limit', '6')
    url.searchParams.set('lang', 'en')
    url.searchParams.set('lat', String(near.lat))
    url.searchParams.set('lon', String(near.lng))
    // Australia bounding box
    url.searchParams.set('bbox', '112.9,-43.7,153.7,-10.6')
    const res = await fetch(url, { signal })
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { features: PhotonFeature[] }
    const places = json.features.map(fromPhoton).filter((p): p is Place => !!p)
    return places.length ? places : searchLocal(query)
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return searchLocal(query)
  }
}

/** Coordinates → nearest address (used when the site pin is dragged). */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<Place | null> {
  try {
    const res = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&lang=en`, {
      signal,
    })
    if (!res.ok) throw new Error(String(res.status))
    const json = (await res.json()) as { features: PhotonFeature[] }
    const first = json.features[0]
    return first ? fromPhoton(first) : null
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    return null
  }
}
