import type { HireType, SearchFilters } from '@/data/types'

/** URL <-> SearchFilters, so searches are shareable and survive refresh. */
export function filtersFromParams(p: URLSearchParams): SearchFilters {
  const num = (k: string) => {
    const v = p.get(k)
    return v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v)
  }
  const hire = p.get('hire')
  return {
    q: p.get('q') ?? undefined,
    categorySlug: p.get('category') ?? undefined,
    location: p.get('location') ?? undefined,
    lat: num('lat'),
    lng: num('lng'),
    startDate: p.get('start') ?? undefined,
    endDate: p.get('end') ?? undefined,
    minTonnes: num('min'),
    maxTonnes: num('max'),
    minPrice: num('pmin'),
    maxPrice: num('pmax'),
    hireType: hire === 'dry' || hire === 'wet' ? (hire as HireType) : undefined,
    sort: (p.get('sort') as SearchFilters['sort']) ?? undefined,
    page: num('page'),
  }
}

export function paramsFromFilters(f: SearchFilters): URLSearchParams {
  const p = new URLSearchParams()
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== '') p.set(k, String(v))
  }
  set('q', f.q)
  set('category', f.categorySlug)
  set('location', f.location)
  set('lat', f.lat)
  set('lng', f.lng)
  set('start', f.startDate)
  set('end', f.endDate)
  set('min', f.minTonnes)
  set('max', f.maxTonnes)
  set('pmin', f.minPrice)
  set('pmax', f.maxPrice)
  set('hire', f.hireType)
  if (f.sort && f.sort !== 'relevance') set('sort', f.sort)
  if (f.page && f.page > 1) set('page', f.page)
  return p
}

/** Number of refinements beyond the keyword/category (the "Filters (3)" badge). */
export function activeFilterCount(f: SearchFilters): number {
  return [
    f.location,
    f.startDate || f.endDate,
    f.minTonnes !== undefined || f.maxTonnes !== undefined,
    f.minPrice !== undefined || f.maxPrice !== undefined,
    f.hireType,
  ].filter(Boolean).length
}
