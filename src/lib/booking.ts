import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export const GST_RATE = 0.1

/** Hire days are inclusive: Mon 26 May – Fri 30 May = 5 days. */
export function hireDays(start: string, end: string): number {
  const n = differenceInCalendarDays(parseISO(end), parseISO(start)) + 1
  return Math.max(0, n)
}

/** Total ex GST in cents: days × daily rate × quantity. */
export function bookingTotal(
  start: string,
  end: string,
  dailyRateCents: number,
  quantity = 1,
): number {
  return hireDays(start, end) * dailyRateCents * quantity
}

export function gstOf(cents: number): number {
  return Math.round(cents * GST_RATE)
}

/**
 * Extension options (board 04): longer extensions get a lower daily rate.
 * Tiers step down $20/day at 7 and 14 days from the booking's daily rate.
 */
export function extensionTiers(dailyRateCents: number, currentEnd: string) {
  const end = parseISO(currentEnd)
  return [
    { days: 3, rate: dailyRateCents },
    { days: 7, rate: Math.max(dailyRateCents - 2000, 0) },
    { days: 14, rate: Math.max(dailyRateCents - 4000, 0) },
  ].map((t) => ({ ...t, newEnd: format(addDays(end, t.days), 'yyyy-MM-dd') }))
}

/** Rate that applies to an extension of `days` (used for custom dates too). */
export function extensionRate(dailyRateCents: number, days: number): number {
  if (days >= 14) return Math.max(dailyRateCents - 4000, 0)
  if (days >= 7) return Math.max(dailyRateCents - 2000, 0)
  return dailyRateCents
}

export function extensionCost(dailyRateCents: number, days: number): number {
  return days * extensionRate(dailyRateCents, days)
}

/** SR-YYYY-NNNN */
export function bookingRef(year: number, sequence: number): string {
  return `SR-${year}-${String(sequence).padStart(4, '0')}`
}

export function isBookingRef(ref: string): boolean {
  return /^SR-\d{4}-\d{4}$/.test(ref)
}

/** Inclusive date-range overlap (mirrors the Postgres exclusion constraint). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/** Booking statuses that hold a machine's calendar. */
export const BLOCKING_STATUSES = ['confirmed', 'in_transit', 'on_site', 'return_scheduled'] as const

/** Smart Swap price deltas (board 04). */
export const SWAP_OPTIONS = [
  {
    id: 'same',
    title: 'Same-Class Swap',
    delta: 0,
    description: 'Swap for another machine of the same class at no additional cost.',
  },
  {
    id: 'upgrade',
    title: 'Upgrade',
    delta: 5000,
    description: 'Move to a larger machine for more power.',
  },
  {
    id: 'downgrade',
    title: 'Downgrade',
    delta: -4000,
    description: 'Switch to a smaller machine and save.',
  },
] as const
export type SwapOptionId = (typeof SWAP_OPTIONS)[number]['id']

/** Haversine distance in km. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Days until an expiry date, and the alert level used on board 10. */
export function expiryLevel(
  expiry: string | null,
  today: Date = new Date(),
): {
  days: number | null
  level: 'expired' | 'critical' | 'warning' | 'ok' | 'none'
} {
  if (!expiry) return { days: null, level: 'none' }
  const days = differenceInCalendarDays(parseISO(expiry), today)
  if (days < 0) return { days, level: 'expired' }
  if (days < 21) return { days, level: 'critical' }
  if (days <= 30) return { days, level: 'warning' }
  return { days, level: 'ok' }
}
