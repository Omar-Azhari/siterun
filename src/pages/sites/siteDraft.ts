import { useCallback, useState } from 'react'
import { addDays, format } from 'date-fns'
import { z } from 'zod'
import type { SiteInput } from '@/data/api'

const KEY = 'siterun-site-draft'

export type SiteDraft = Partial<SiteInput>

const DEMO: SiteDraft = {
  name: 'Riverside Apartments',
  address: '123 Construction Rd',
  suburb: 'Campbellfield',
  state: 'VIC',
  postcode: '3061',
  lat: -37.6833,
  lng: 144.9583,
  projectType: 'Commercial Construction',
  startDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
  durationMonths: 6,
  deliveryFrom: '07:00',
  deliveryTo: '16:00',
  accessNotes: 'Enter via Gate 2. Report to site office. PPE required.',
  contactName: 'Alex Turner',
  contactPhone: '412 345 678',
}

function read(): SiteDraft {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as SiteDraft
  } catch {
    return {}
  }
}

/** Multi-step "create site" state, kept in sessionStorage so refreshes don't lose it. */
export function useSiteDraft(demo = false) {
  const [draft, setDraft] = useState<SiteDraft>(() => {
    const current = read()
    return demo ? { ...DEMO, ...current } : current
  })
  const update = useCallback((patch: SiteDraft) => {
    setDraft((d) => {
      const next = { ...d, ...patch }
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        // storage unavailable: keep in memory
      }
      return next
    })
  }, [])
  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // ignore
    }
    setDraft({})
  }, [])
  return { draft, update, clear }
}

export const DURATIONS = [1, 2, 3, 4, 6, 9, 12, 18, 24].map((m) => ({
  value: String(m),
  label: `${m} month${m === 1 ? '' : 's'}`,
}))

export const detailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter a site name'),
  projectType: z.string().min(1, 'Choose a project type'),
  startDate: z.string().min(1, 'Choose a start date'),
  durationMonths: z.string().min(1, 'Choose a duration'),
})
export type DetailsValues = z.infer<typeof detailsSchema>

export const accessSchema = z
  .object({
    deliveryFrom: z.string().min(1, 'Choose a start time'),
    deliveryTo: z.string().min(1, 'Choose an end time'),
    accessNotes: z.string().max(250, 'Keep notes under 250 characters'),
    contactName: z.string().trim().min(2, 'Enter a site contact'),
    contactPhone: z.string().refine((v) => v.replace(/\D/g, '').length >= 8, 'Enter a valid phone number'),
  })
  .refine((v) => v.deliveryTo > v.deliveryFrom, { message: 'End time must be after start time', path: ['deliveryTo'] })
export type AccessValues = z.infer<typeof accessSchema>

