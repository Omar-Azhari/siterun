import { format, isValid, parseISO } from 'date-fns'

const whole = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
})
const exact = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
})

/**
 * Formats integer cents as AUD. Rates show whole dollars ("$320"); balances and
 * invoices show cents ("$12,480.00").
 */
export function formatMoney(cents: number, opts: { cents?: boolean } = {}): string {
  return (opts.cents ? exact : whole).format(cents / 100)
}

/** Compact money for stat tiles: $48.3k, $412k, $1.2m. */
export function formatMoneyCompact(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1_000_000) return `$${trim(dollars / 1_000_000)}m`
  if (dollars >= 1_000) return `$${trim(dollars / 1_000)}k`
  return whole.format(dollars)
}
const trim = (n: number) => (n >= 100 ? Math.round(n).toString() : n.toFixed(1).replace(/\.0$/, ''))

const toDate = (d: Date | string) => (typeof d === 'string' ? parseISO(d) : d)

/** "Mon, 26 May 2025" */
export function formatDateLong(d: Date | string): string {
  const date = toDate(d)
  return isValid(date) ? format(date, 'EEE, d MMM yyyy') : ''
}

/** "26 May 2025" */
export function formatDate(d: Date | string): string {
  const date = toDate(d)
  return isValid(date) ? format(date, 'd MMM yyyy') : ''
}

/** "7:00 AM" from "07:00" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return ''
  const d = new Date(2000, 0, 1, h, m)
  return format(d, 'h:mm a')
}

/** Initials for avatars: "Alex Turner" → "AT". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}
