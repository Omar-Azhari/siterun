import { useSyncExternalStore } from 'react'
import { ApiError } from '@/data/api'
import { distanceKm } from '@/lib/booking'
import type { PositionFix } from '@/native/device'

/**
 * Shares the driver's position for one delivery at a time. It keeps running while the
 * driver moves around the app, and stops when they tap Stop, when the delivery is no
 * longer on its way, or when the app is closed. Phones only send while SiteRun is open
 * (background tracking needs a separate native plugin).
 */
export interface LiveShareState {
  bookingId: string | null
  status: 'idle' | 'starting' | 'sharing' | 'stopped' | 'error'
  lastSentAt: number | null
  message: string | null
}

const MIN_GAP_MS = 6_000
const HEARTBEAT_MS = 20_000
const MIN_MOVE_KM = 0.03

/** Send when the truck has moved 30 m, or every 20 s while parked, never faster than 6 s
 * (the database allows 720 an hour). */
export function shouldSend(
  last: { at: number; lat: number; lng: number } | null,
  fix: { lat: number; lng: number },
  now: number,
): boolean {
  if (!last) return true
  if (now - last.at < MIN_GAP_MS) return false
  if (now - last.at >= HEARTBEAT_MS) return true
  return distanceKm(last.lat, last.lng, fix.lat, fix.lng) >= MIN_MOVE_KM
}

let state: LiveShareState = { bookingId: null, status: 'idle', lastSentAt: null, message: null }
const listeners = new Set<() => void>()
let stopWatch: (() => void) | null = null
let last: { at: number; lat: number; lng: number } | null = null
let inFlight = false
let wakeLock: { release: () => Promise<void> } | null = null

function set(patch: Partial<LiveShareState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

async function keepScreenOn(on: boolean) {
  try {
    if (on) {
      const nav = navigator as Navigator & {
        wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> }
      }
      wakeLock = (await nav.wakeLock?.request('screen')) ?? null
    } else {
      await wakeLock?.release()
      wakeLock = null
    }
  } catch {
    // Not supported, or the page is hidden.
  }
}

async function send(bookingId: string, fix: PositionFix) {
  const now = Date.now()
  if (inFlight || !shouldSend(last, fix, now)) return
  inFlight = true
  try {
    const { getApi } = await import('@/data/client')
    await getApi().reportLocation(bookingId, fix)
    last = { at: now, lat: fix.lat, lng: fix.lng }
    if (state.bookingId === bookingId) set({ status: 'sharing', lastSentAt: now, message: null })
  } catch (e) {
    // The delivery ended or this person can't share for it: stop for good. Anything else
    // (a dropped connection) is retried with the next position.
    if (e instanceof ApiError && e.code !== 'unknown') {
      stopLiveShare(e.message, 'stopped')
    } else if (state.bookingId === bookingId) {
      set({ message: 'Connection lost. Still trying to send your location.' })
    }
  } finally {
    inFlight = false
  }
}

export async function startLiveShare(bookingId: string) {
  stopLiveShare()
  set({ bookingId, status: 'starting', lastSentAt: null, message: null })
  const { watchPosition } = await import('@/native/device')
  const stop = await watchPosition(
    (fix) => void send(bookingId, fix),
    (message) => {
      if (state.bookingId === bookingId) set({ status: 'error', message })
    },
  )
  // Stopped (or switched to another booking) while waiting for permission.
  if (state.bookingId !== bookingId) {
    stop()
    return
  }
  stopWatch = stop
  void keepScreenOn(true)
}

export function stopLiveShare(
  message: string | null = null,
  status: LiveShareState['status'] = 'idle',
) {
  stopWatch?.()
  stopWatch = null
  last = null
  void keepScreenOn(false)
  if (state.bookingId || state.status !== 'idle') {
    set({ bookingId: status === 'idle' ? null : state.bookingId, status, message })
  }
}

export function useLiveShare(): LiveShareState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
