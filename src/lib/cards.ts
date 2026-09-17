export type CardBrand = 'visa' | 'mastercard' | 'amex'

export function luhnValid(digits: string): boolean {
  if (!/^\d{12,19}$/.test(digits)) return false
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

export function cardBrand(digits: string): CardBrand | null {
  if (/^4/.test(digits)) return 'visa'
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(digits)) return 'mastercard'
  if (/^3[47]/.test(digits)) return 'amex'
  return null
}

/** "04/28" → { month: 4, year: 2028, expired } */
export function parseExpiry(value: string, now: Date = new Date()): { month: number; year: number; expired: boolean } | null {
  const m = /^(\d{2})\/(\d{2})$/.exec(value)
  if (!m) return null
  const month = Number(m[1])
  const year = 2000 + Number(m[2])
  if (month < 1 || month > 12) return null
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  return { month, year, expired: endOfMonth < now }
}
