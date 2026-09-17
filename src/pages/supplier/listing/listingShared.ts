import { useMachine } from '@/data/hooks'
import type { Machine } from '@/data/types'

export const STEPS = ['category', 'details', 'photos', 'specs', 'rates', 'service-area'] as const
export type StepId = (typeof STEPS)[number]

export const stepNumber = (s: StepId) => STEPS.indexOf(s) + 1
export const nextStep = (s: StepId): StepId | null => STEPS[STEPS.indexOf(s) + 1] ?? null
export const stepPath = (id: string, s: StepId) => `/supplier/machines/${id}/edit/${s}`

export function useListing(id?: string) {
  return useMachine(id)
}

export interface SpecField {
  key: string
  unit: string
  required?: boolean
  /** Used to derive the searchable size in tonnes. */
  tonnes?: (v: number) => number
}

/** Specification fields per category (board 07 step 4 adapts by category). */
export const SPEC_FIELDS: Record<string, SpecField[]> = {
  excavators: [
    { key: 'Operating weight', unit: 'kg', required: true, tonnes: (v) => v / 1000 },
    { key: 'Bucket capacity', unit: 'm³', required: true },
    { key: 'Max reach', unit: 'm', required: true },
    { key: 'Max dig depth', unit: 'm' },
  ],
  telehandlers: [
    { key: 'Lift capacity', unit: 'kg', required: true, tonnes: (v) => v / 1000 },
    { key: 'Max lift height', unit: 'm', required: true },
    { key: 'Operating weight', unit: 'kg' },
  ],
  cranes: [
    { key: 'Max lift capacity', unit: 't', required: true, tonnes: (v) => v },
    { key: 'Boom length', unit: 'm', required: true },
    { key: 'Operating weight', unit: 'kg' },
  ],
  generators: [
    { key: 'Prime power', unit: 'kVA', required: true },
    { key: 'Fuel tank', unit: 'L' },
    { key: 'Weight', unit: 'kg' },
  ],
  access: [
    { key: 'Platform height', unit: 'm', required: true },
    { key: 'Working height', unit: 'm' },
    { key: 'Capacity', unit: 'kg', required: true },
  ],
  attachments: [
    { key: 'Suits excavators', unit: 't', required: true },
    { key: 'Weight', unit: 'kg' },
    { key: 'Width', unit: 'mm' },
  ],
  loaders: [
    { key: 'Bucket capacity', unit: 'm³', required: true },
    { key: 'Operating weight', unit: 'kg', required: true, tonnes: (v) => v / 1000 },
    { key: 'Rated capacity', unit: 'kg' },
  ],
  'other-plant': [
    { key: 'Payload', unit: 'kg', tonnes: (v) => v / 1000 },
    { key: 'Operating weight', unit: 'kg' },
  ],
}

export const FUEL_TYPES = ['Diesel', 'Petrol', 'Electric', 'Hybrid', 'LPG', 'None']
export const MIN_BOOKINGS = ['4 hours', '1 day', '3 days', '1 week']

/** "21,300 kg" → "21300" for editing. Keeps ranges like "8–15" as typed. */
export function specNumber(v: string | undefined): string {
  if (!v) return ''
  return v.replace(/\s*[a-zA-Z³]+$/, '').replace(/,/g, '').trim()
}

export function specValue(raw: string, unit: string): string {
  const n = Number(raw)
  const shown = Number.isFinite(n) && raw.trim() !== '' ? n.toLocaleString('en-AU', { maximumFractionDigits: 2 }) : raw.trim()
  return `${shown} ${unit}`
}

/** Downscale a photo before upload (max 1600px, JPEG ~80%). */
export async function compressImage(file: File, maxDim = 1600): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
  if (!blob || blob.size >= file.size) return file
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
}

export const isEditable = (m: Machine | null | undefined): m is Machine => !!m && ['draft', 'rejected', 'paused'].includes(m.status)
