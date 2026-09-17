import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateLong,
  formatMoney,
  formatMoneyCompact,
  formatTime,
  initials,
  shortTime,
  timeAgo,
} from './format'

describe('formatMoney', () => {
  it('formats rates as whole dollars and balances with cents', () => {
    expect(formatMoney(32000)).toBe('$320')
    expect(formatMoney(160000)).toBe('$1,600')
    expect(formatMoney(1248000, { cents: true })).toBe('$12,480.00')
  })
  it('compacts large values', () => {
    expect(formatMoneyCompact(4830000)).toBe('$48.3k')
    expect(formatMoneyCompact(41200000)).toBe('$412k')
    expect(formatMoneyCompact(50000)).toBe('$500')
  })
})

describe('dates and names', () => {
  it('formats dates like the mockups', () => {
    expect(formatDateLong('2025-05-26')).toBe('Mon, 26 May 2025')
    expect(formatDate('2025-11-12')).toBe('12 Nov 2025')
    expect(formatDate('nope')).toBe('')
  })
  it('formats times', () => {
    expect(formatTime('07:00')).toBe('7:00 AM')
    expect(formatTime('16:00')).toBe('4:00 PM')
  })
  it('builds initials', () => {
    expect(initials('Alex Turner')).toBe('AT')
    expect(initials('john')).toBe('J')
  })
})

describe('relative times', () => {
  const now = new Date(2026, 8, 16, 12, 0)
  it('formats time ago', () => {
    expect(timeAgo(new Date(2026, 8, 16, 10, 0).toISOString(), now)).toBe('2h ago')
    expect(timeAgo(new Date(2026, 8, 15, 11, 0).toISOString(), now)).toBe('1d ago')
    expect(timeAgo(new Date(2026, 8, 16, 11, 59, 50).toISOString(), now)).toBe('just now')
  })
  it('shows clock time for today in conversation lists', () => {
    expect(shortTime(new Date(2026, 8, 16, 10, 24).toISOString(), now)).toBe('10:24 AM')
    expect(shortTime(new Date(2026, 8, 14, 10, 24).toISOString(), now)).toBe('2d')
  })
})
