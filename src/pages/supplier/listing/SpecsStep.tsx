import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CircleGauge, Container, Fuel, MoveDiagonal, MoveDown, Paperclip, Plus, Weight } from 'lucide-react'
import { Chip, Input, Select } from '@/components/ui'
import { useApiMutation, useCategories } from '@/data/hooks'
import { FUEL_TYPES, isEditable, SPEC_FIELDS, specNumber, specValue, stepPath, useListing } from './listingShared'
import { ListingGate, WizardFrame } from './WizardFrame'

const ICONS: Record<string, React.ReactNode> = {
  'Operating weight': <Weight />,
  'Bucket capacity': <Container />,
  'Max reach': <MoveDiagonal />,
  'Max dig depth': <MoveDown />,
}

/** Board 07 · Step 4: asset specifications (fields adapt to the category). */
export function SpecsStep() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const q = useListing(id)
  const m = q.data
  const categories = useCategories()
  const slug = categories.data?.find((c) => c.id === m?.categoryId)?.slug ?? 'other-plant'
  const fields = SPEC_FIELDS[slug] ?? SPEC_FIELDS['other-plant'] ?? []
  const [values, setValues] = useState<Record<string, string> | null>(null)
  const [attachments, setAttachments] = useState<string[] | null>(null)
  const [fuel, setFuel] = useState<string | null>(null)
  const [newAttachment, setNewAttachment] = useState('')
  const [adding, setAdding] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const save = useApiMutation((api, patch: Parameters<typeof api.saveMachineDraft>[1]) => api.saveMachineDraft(id, patch))

  if (!isEditable(m)) return <ListingGate query={q} machine={m} />

  const vals = values ?? Object.fromEntries(fields.map((f) => [f.key, specNumber(m.specs[f.key])]))
  const atts = attachments ?? m.attachments
  const fuelType = fuel ?? (m.fuelType || 'Diesel')
  const errorFor = (key: string, required?: boolean) => {
    if (!submitted) return undefined
    const v = vals[key]?.trim() ?? ''
    if (required && !v) return 'Required'
    if (v && !/^\d+(\.\d+)?([–-]\d+(\.\d+)?)?$/.test(v)) return 'Numbers only'
    return undefined
  }

  const onContinue = () => {
    setSubmitted(true)
    const bad = fields.some((f) => {
      const v = vals[f.key]?.trim() ?? ''
      return (f.required && !v) || (v && !/^\d+(\.\d+)?([–-]\d+(\.\d+)?)?$/.test(v))
    })
    if (bad) return
    const specs: Record<string, string> = {}
    let tonnes: number | null = m.capacityTonnes
    for (const f of fields) {
      const v = vals[f.key]?.trim()
      if (!v) continue
      specs[f.key] = specValue(v, f.unit)
      if (f.tonnes && !Number.isNaN(Number(v))) tonnes = Math.round(f.tonnes(Number(v)) * 10) / 10
    }
    save.mutate({ specs, attachments: atts, fuelType, capacityTonnes: tonnes, draftStep: 4 }, { onSuccess: () => navigate(stepPath(id, 'rates')) })
  }

  const addAttachment = () => {
    const v = newAttachment.trim()
    if (v && !atts.includes(v)) setAttachments([...atts, v])
    setNewAttachment('')
    setAdding(false)
  }

  return (
    <WizardFrame step="specs" title="Asset Specifications" subtitle="Add detailed specifications to help customers find your machine." onContinue={onContinue} saving={save.isPending}>
      {fields.map((f) => (
        <div key={f.key} className="flex items-start gap-3">
          <span className="mt-8 w-8 shrink-0 text-primary [&_svg]:size-7 [&_svg]:stroke-[1.5]">{ICONS[f.key] ?? <CircleGauge />}</span>
          <Input
            className="flex-1"
            label={`${f.key}${f.required ? ' *' : ''}`}
            inputMode="decimal"
            value={vals[f.key] ?? ''}
            onChange={(e) => setValues({ ...vals, [f.key]: e.target.value })}
            rightSlot={<span className="text-sm text-muted">{f.unit}</span>}
            error={errorFor(f.key, f.required)}
          />
        </div>
      ))}

      <div className="mb-4 flex items-start gap-3">
        <Paperclip className="mt-0.5 size-7 w-8 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
        <div className="flex-1">
          <p className="mb-2 text-sm">Attachments</p>
          <div className="flex flex-wrap gap-2">
            {atts.map((a) => (
              <Chip key={a} onRemove={() => setAttachments(atts.filter((x) => x !== a))}>
                {a}
              </Chip>
            ))}
            {atts.length === 0 && <span className="text-sm text-muted">None added</span>}
          </div>
          {adding ? (
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                addAttachment()
              }}
            >
              <Input label="Attachment name" hideLabel className="mb-0 flex-1" autoFocus value={newAttachment} onChange={(e) => setNewAttachment(e.target.value)} placeholder="e.g. Tilt Bucket" />
              <button type="submit" className="rounded-[10px] bg-primary px-4 text-sm font-medium">
                Add
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setAdding(true)} className="mt-2 flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary">
              <Plus className="size-4" aria-hidden /> Add attachment
            </button>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Fuel className="mt-8 size-7 w-8 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
        <Select className="flex-1" label="Fuel type *" value={fuelType} onChange={(e) => setFuel(e.target.value)} options={FUEL_TYPES.map((t) => ({ value: t, label: t }))} />
      </div>
    </WizardFrame>
  )
}
