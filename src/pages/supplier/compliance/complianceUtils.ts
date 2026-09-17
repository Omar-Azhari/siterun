import { useState } from 'react'
import type { ComplianceDocument, ComplianceRequirement } from '@/data/types'

export const STATES = [
  { value: 'VIC', short: 'VIC', name: 'Victoria', label: 'Melbourne, VIC' },
  { value: 'NSW', short: 'NSW', name: 'New South Wales', label: 'Sydney, NSW' },
  { value: 'QLD', short: 'QLD', name: 'Queensland', label: 'Brisbane, QLD' },
  { value: 'WA', short: 'WA', name: 'Western Australia', label: 'Perth, WA' },
  { value: 'SA', short: 'SA', name: 'South Australia', label: 'Adelaide, SA' },
  { value: 'TAS', short: 'TAS', name: 'Tasmania', label: 'Hobart, TAS' },
  { value: 'ACT', short: 'ACT', name: 'Australian Capital Territory', label: 'Canberra, ACT' },
  { value: 'NT', short: 'NT', name: 'Northern Territory', label: 'Darwin, NT' },
]

export function useComplianceState() {
  const [state, setStateRaw] = useState<string>(() => {
    try {
      return localStorage.getItem('siterun-compliance-state') ?? 'VIC'
    } catch {
      return 'VIC'
    }
  })
  const setState = (v: string) => {
    setStateRaw(v)
    try {
      localStorage.setItem('siterun-compliance-state', v)
    } catch {
      // ignore
    }
  }
  return [state, setState] as const
}

export type DocState = 'verified' | 'pending' | 'rejected' | 'missing' | 'expired'

export function latestFor(docs: ComplianceDocument[], req: ComplianceRequirement) {
  return docs.filter((d) => d.requirementId === req.id).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0]
}

export function docState(doc: ComplianceDocument | undefined, today = new Date().toISOString().slice(0, 10)): DocState {
  if (!doc) return 'missing'
  if (doc.status === 'verified' && doc.expiryDate && doc.expiryDate < today) return 'expired'
  return doc.status
}


const TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const MAX = 10 * 1024 * 1024
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`

export function validateFile(f: File): string | null {
  if (!TYPES.includes(f.type)) return 'Upload a PDF, JPG or PNG file.'
  if (f.size > MAX) return `This file is ${mb(f.size)}. The limit is 10 MB.`
  if (f.size === 0) return 'This file is empty.'
  return null
}

