import { FlagAU, FlagNZ } from '../icons/Flags'

export const COUNTRIES = [
  { code: 'AU', dial: '+61', name: 'Australia', Flag: FlagAU },
  { code: 'NZ', dial: '+64', name: 'New Zealand', Flag: FlagNZ },
] as const
export type CountryCode = (typeof COUNTRIES)[number]['code']

/** "412345678" → "412 345 678" */
export function formatAuMobile(raw: string): string {
  const d = raw.replace(/\D/g, '').replace(/^0/, '').slice(0, 9)
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(' ')
}
