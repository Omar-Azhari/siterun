import { describe, expect, it } from 'vitest'
import { cardBrand, luhnValid, parseExpiry } from './cards'

describe('cards', () => {
  it('validates with Luhn', () => {
    expect(luhnValid('4242424242424242')).toBe(true)
    expect(luhnValid('4242424242424241')).toBe(false)
    expect(luhnValid('42')).toBe(false)
  })
  it('detects brands', () => {
    expect(cardBrand('4242')).toBe('visa')
    expect(cardBrand('5555555555554444')).toBe('mastercard')
    expect(cardBrand('2223003122003222')).toBe('mastercard')
    expect(cardBrand('378282246310005')).toBe('amex')
    expect(cardBrand('6011')).toBeNull()
  })
  it('parses expiry', () => {
    const now = new Date(2026, 8, 16)
    expect(parseExpiry('04/28', now)).toEqual({ month: 4, year: 2028, expired: false })
    expect(parseExpiry('08/26', now)?.expired).toBe(true)
    expect(parseExpiry('09/26', now)?.expired).toBe(false)
    expect(parseExpiry('13/26', now)).toBeNull()
    expect(parseExpiry('0426', now)).toBeNull()
  })
})
