import { useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus } from 'lucide-react'
import { Input, Select, useToast } from '@/components/ui'
import { useApiMutation } from '@/data/hooks'
import { compressImage, isEditable, stepPath, useListing } from './listingShared'
import { ListingGate, WizardFrame } from './WizardFrame'

const thisYear = new Date().getFullYear()
const schema = z.object({
  make: z.string().trim().min(2, 'Enter the make'),
  model: z.string().trim().min(1, 'Enter the model'),
  year: z.string().min(4, 'Choose the year'),
  serialNumber: z.string().trim().min(5, 'Enter the serial number'),
  registration: z.string().trim().max(20),
})
type Values = z.infer<typeof schema>

/** Board 07 · Step 2: machine details */
export function DetailsStep() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const q = useListing(id)
  const m = q.data
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: m
      ? {
          make: m.make,
          model: m.model,
          year: m.year ? String(m.year) : '',
          serialNumber: m.serialNumber,
          registration: m.registration,
        }
      : undefined,
    resetOptions: { keepDirtyValues: true },
  })
  const save = useApiMutation((api, v: Values) =>
    api.saveMachineDraft(id, { ...v, year: Number(v.year), draftStep: 2 }),
  )
  const photo = useApiMutation(
    async (api, file: File) => {
      const url = await api.uploadMachinePhoto(id, await compressImage(file))
      return api.saveMachineDraft(id, { photos: [url, ...(m?.photos ?? [])].slice(0, 10) })
    },
    { success: 'Main photo updated' },
  )

  if (!isEditable(m)) return <ListingGate query={q} machine={m} />
  const e = form.formState.errors

  return (
    <WizardFrame
      step="details"
      title="Machine Details"
      subtitle="Enter the key details about your machine."
      saving={save.isPending}
      onContinue={form.handleSubmit((v) =>
        save.mutate(v, { onSuccess: () => navigate(stepPath(id, 'photos')) }),
      )}
    >
      <div className="relative mb-4 aspect-[16/9] overflow-hidden rounded-[14px] border border-line bg-input">
        {m.photos[0] ? (
          <img
            src={m.photos[0]}
            alt={`${m.make} ${m.model} main photo`}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-muted">
            <ImagePlus className="size-8" aria-hidden />
            Add a main photo
          </div>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(ev) => {
            const f = ev.target.files?.[0]
            ev.target.value = ''
            if (!f) return
            if (f.size > 15 * 1024 * 1024)
              return toast.error('Photo too large', 'Choose a photo under 15MB.')
            photo.mutate(f)
          }}
        />
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={photo.isPending}
          className="absolute right-2.5 bottom-2.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium hover:bg-primary-hover disabled:opacity-60"
        >
          {photo.isPending ? 'Uploading…' : m.photos[0] ? 'Change' : 'Add photo'}
        </button>
      </div>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
        }}
        noValidate
      >
        <Input
          label="Make *"
          placeholder="Caterpillar"
          error={e.make?.message}
          {...form.register('make')}
        />
        <Input
          label="Model *"
          placeholder="320D"
          error={e.model?.message}
          {...form.register('model')}
        />
        <Select
          label="Year *"
          placeholder="Select year"
          options={Array.from({ length: 30 }, (_, i) => String(thisYear - i)).map((y) => ({
            value: y,
            label: y,
          }))}
          error={e.year?.message}
          {...form.register('year')}
        />
        <Input
          label="Serial number *"
          autoCapitalize="characters"
          placeholder="CAT0320DJKM12345"
          error={e.serialNumber?.message}
          {...form.register('serialNumber')}
        />
        <Input
          label="Registration number"
          autoCapitalize="characters"
          placeholder="CR-3260"
          hint="e.g. State registration or fleet number"
          error={e.registration?.message}
          {...form.register('registration')}
        />
      </form>
    </WizardFrame>
  )
}
