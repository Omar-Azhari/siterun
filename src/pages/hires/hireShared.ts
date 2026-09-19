import { useBooking } from '@/data/hooks'
import type { BookingView } from '@/data/types'

export function useHire(id?: string) {
  const q = useBooking(id)
  const b = q.data
  const state = q.isPending ? 'loading' : q.isError ? 'error' : !b ? 'missing' : 'ready'
  return { q, b, state } as const
}

export const isLive = (b: BookingView) =>
  ['in_transit', 'on_site', 'return_scheduled', 'confirmed'].includes(b.status)
