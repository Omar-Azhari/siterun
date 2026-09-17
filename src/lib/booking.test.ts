import { describe, expect, it } from 'vitest'
import {
  bookingRef,
  bookingTotal,
  distanceKm,
  expiryLevel,
  extensionCost,
  extensionTiers,
  gstOf,
  hireDays,
  isBookingRef,
  rangesOverlap,
} from './booking'

describe('booking maths', () => {
  it('counts hire days inclusively', () => {
    expect(hireDays('2025-05-26', '2025-05-30')).toBe(5)
    expect(hireDays('2025-05-26', '2025-06-06')).toBe(12)
    expect(hireDays('2025-05-26', '2025-05-26')).toBe(1)
    expect(hireDays('2025-05-30', '2025-05-26')).toBe(0)
  })

  it('totals days × rate × quantity (5 × $320 = $1,600)', () => {
    expect(bookingTotal('2025-05-26', '2025-05-30', 32000)).toBe(160000)
    expect(bookingTotal('2025-05-26', '2025-05-30', 32000, 2)).toBe(320000)
  })

  it('prices extensions by tier (3 × $320 = $960)', () => {
    expect(extensionCost(32000, 3)).toBe(96000)
    expect(extensionCost(32000, 7)).toBe(7 * 30000)
    expect(extensionCost(32000, 14)).toBe(14 * 28000)
    const tiers = extensionTiers(32000, '2025-06-06')
    expect(tiers.map((t) => [t.days, t.rate, t.newEnd])).toEqual([
      [3, 32000, '2025-06-09'],
      [7, 30000, '2025-06-13'],
      [14, 28000, '2025-06-20'],
    ])
  })

  it('adds 10% GST', () => {
    expect(gstOf(160000)).toBe(16000)
  })

  it('formats booking references', () => {
    expect(bookingRef(2026, 42)).toBe('SR-2026-0042')
    expect(isBookingRef('SR-2025-7842')).toBe(true)
    expect(isBookingRef('BK-7842')).toBe(false)
  })

  it('detects inclusive overlaps', () => {
    expect(rangesOverlap('2025-06-01', '2025-06-05', '2025-06-05', '2025-06-08')).toBe(true)
    expect(rangesOverlap('2025-06-01', '2025-06-04', '2025-06-05', '2025-06-08')).toBe(false)
  })

  it('measures distance', () => {
    // Melbourne CBD → Geelong is ~64 km
    expect(Math.round(distanceKm(-37.8136, 144.9631, -38.1499, 144.3617))).toBeGreaterThan(60)
    expect(Math.round(distanceKm(-37.8136, 144.9631, -38.1499, 144.3617))).toBeLessThan(70)
  })

  it('classifies document expiry', () => {
    const today = new Date(2025, 5, 1)
    expect(expiryLevel('2025-06-13', today)).toEqual({ days: 12, level: 'critical' })
    expect(expiryLevel('2025-06-29', today)).toEqual({ days: 28, level: 'warning' })
    expect(expiryLevel('2025-09-01', today).level).toBe('ok')
    expect(expiryLevel('2025-05-01', today).level).toBe('expired')
    expect(expiryLevel(null, today).level).toBe('none')
  })
})
