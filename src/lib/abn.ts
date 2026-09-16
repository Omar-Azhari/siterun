const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const

/** Strips spaces and validates an Australian Business Number using the ATO checksum. */
export function isValidAbn(input: string): boolean {
  const digits = input.replace(/\s+/g, '')
  if (!/^\d{11}$/.test(digits)) return false
  const nums = [...digits].map(Number)
  nums[0] = (nums[0] ?? 0) - 1
  const sum = nums.reduce((acc, d, i) => acc + d * (WEIGHTS[i] ?? 0), 0)
  return sum % 89 === 0
}

/** Formats as "12 345 678 901". */
export function formatAbn(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 11)
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 11)].filter(Boolean).join(' ')
}
