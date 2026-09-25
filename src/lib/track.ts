import { useEffect, useRef } from 'react'
import { getApi } from '@/data/client'
import type { TrackedEvent } from '@/data/types'

interface Detail {
  machineId?: string
  category?: string
  query?: string
}

/** Records one usage event. Never throws and never blocks what the screen is doing. */
export function track(event: TrackedEvent, detail: Detail = {}) {
  void getApi()
    .track(event, detail)
    .catch(() => {})
}

/**
 * Records an event once per screen, and again only when what it describes changes: a new
 * search, a different machine. Re-renders and filter tweaks don't count twice.
 */
export function useTrack(event: TrackedEvent, detail: Detail = {}) {
  const key = `${detail.machineId ?? ''}|${detail.category ?? ''}|${detail.query ?? ''}`
  const sent = useRef<string | null>(null)
  useEffect(() => {
    // Wait until the screen knows what it is showing.
    if (event === 'search' ? false : !detail.machineId) return
    if (sent.current === key) return
    sent.current = key
    track(event, detail)
    // `key` is the whole of `detail` that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key])
}
