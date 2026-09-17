import { HardHat, Truck, UserRoundCog, UsersRound } from 'lucide-react'
import { z } from 'zod'
import type { AccountType } from '@/data/types'

export const ROLE_OPTIONS: {
  value: AccountType
  title: string
  description: string
  icon: typeof HardHat
}[] = [
  {
    value: 'contractor',
    title: 'Contractor',
    description: 'Hire equipment and manage projects',
    icon: HardHat,
  },
  {
    value: 'supplier',
    title: 'Supplier',
    description: 'List and manage your equipment',
    icon: Truck,
  },
  {
    value: 'operator',
    title: 'Operator',
    description: 'Work on site and manage bookings',
    icon: UserRoundCog,
  },
  { value: 'org_admin', title: 'Admin', description: 'Manage your organisation', icon: UsersRound },
]

export const passwordRules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'Includes a number', test: (v: string) => /\d/.test(v) },
  { label: 'Includes a letter', test: (v: string) => /[a-z]/i.test(v) },
]

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .regex(/\d/, 'Include a number')
  .regex(/[a-z]/i, 'Include a letter')

export const phoneSchema = z
  .string()
  .refine((v) => v.replace(/\D/g, '').length >= 8, 'Enter a valid phone number')
