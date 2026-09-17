import { addDays, format } from 'date-fns'
import type { StatusKey, Tone } from '@/components/ui'
import type { BookingStatus, BookingView } from '@/data/types'

type Pill = { status?: StatusKey; label?: string; tone?: Tone; mark?: 'dot' | 'check' | 'none' }

const today = () => format(new Date(), 'yyyy-MM-dd')
const tomorrow = () => format(addDays(new Date(), 1), 'yyyy-MM-dd')

/** Contractor view of a hire (board 04 list and detail). */
export function hirePill(b: Pick<BookingView, 'status' | 'endDate' | 'startDate'>): Pill {
  if (b.status === 'on_site' && b.endDate <= tomorrow()) return { status: 'ending_soon' }
  return basePill(b.status, b.startDate)
}

/** Contractor calendar (board 05): Confirmed today, Upcoming later. */
export function calendarPill(b: Pick<BookingView, 'status' | 'startDate'>, day: string): Pill {
  if (b.status === 'completed') return { status: 'completed' }
  if (b.status === 'confirmed' && b.startDate > day) return { status: 'upcoming' }
  if (['confirmed', 'in_transit', 'on_site', 'return_scheduled'].includes(b.status))
    return { status: 'booking_confirmed' }
  return basePill(b.status, b.startDate)
}

/** Supplier dispatch (board 09): Hired once the machine has left the yard. */
export function dispatchPill(b: Pick<BookingView, 'status' | 'startDate'>): Pill {
  if (['in_transit', 'on_site', 'return_scheduled'].includes(b.status)) return { status: 'hired' }
  return basePill(b.status, b.startDate)
}

export function basePill(status: BookingStatus, startDate?: string): Pill {
  switch (status) {
    case 'requested':
      return { label: 'Awaiting Supplier', tone: 'warning', mark: 'dot' }
    case 'confirmed':
      return startDate && startDate > today() ? { status: 'confirmed' } : { status: 'confirmed' }
    case 'in_transit':
      return { status: 'in_transit' }
    case 'on_site':
      return { status: 'on_site' }
    case 'return_scheduled':
      return { label: 'Return Booked', tone: 'info', mark: 'dot' }
    case 'completed':
      return { status: 'completed' }
    case 'declined':
      return { status: 'declined' }
    case 'cancelled':
      return { status: 'cancelled' }
  }
}

export const DELIVERY_LABEL = { pickup: 'Customer Pickup', delivery: 'Site Delivery' } as const
