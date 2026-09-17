import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, DateField, Input, ScreenTitle, Select } from '@/components/ui'
import { PROJECT_TYPES } from '@/data/seed'
import { cardClass } from '@/components/ui/Card'
import { cn } from '@/lib/cn'
import { detailsSchema, DURATIONS, useSiteDraft, type DetailsValues } from './siteDraft'

/** Board 02 · Site Details */
export function SiteDetailsPage() {
  const [params] = useSearchParams()
  const demo = params.get('demo') === '1'
  const navigate = useNavigate()
  const { draft, update } = useSiteDraft(demo)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: draft.name ?? '',
      projectType: draft.projectType ?? 'Commercial Construction',
      startDate: draft.startDate ?? '',
      durationMonths: String(draft.durationMonths ?? 6),
    },
  })

  if (draft.lat === undefined) return <Navigate to="/sites/new/location" replace />

  const onSubmit = handleSubmit((v) => {
    update({ ...v, durationMonths: Number(v.durationMonths) })
    navigate(`/sites/new/access${demo ? '?demo=1' : ''}`)
  })

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow type="submit" form="site-details">
          Continue
        </Button>
      }
    >
      <ScreenTitle title="Site Details" subtitle="Tell us about your project." />
      <form id="site-details" onSubmit={onSubmit} noValidate>
        <Input label="Site name" placeholder="Riverside Apartments" error={errors.name?.message} {...register('name')} />
        <div className="mb-3.5">
          <p className="mb-1.5 text-sm text-[#dae4ef]">Address</p>
          <Link to="/sites/new/location" className={cn(cardClass, 'flex items-center gap-3 rounded-[10px] border-line-input bg-input bg-none px-3.5 py-3 hover:border-primary')}>
            <span className="flex-1 text-[15px] leading-snug">
              {draft.address}
              <br />
              {[draft.suburb, draft.state, draft.postcode].filter(Boolean).join(' ')}
            </span>
            <MapPin className="size-5 text-[#dae4ef]" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">Change location</span>
          </Link>
        </div>
        <Select label="Project type" options={PROJECT_TYPES.map((t) => ({ value: t, label: t }))} error={errors.projectType?.message} {...register('projectType')} />
        <Controller
          control={control}
          name="startDate"
          render={({ field }) => <DateField label="Start date" value={field.value} onChange={field.onChange} error={errors.startDate?.message} />}
        />
        <Select label="Expected duration" options={DURATIONS} error={errors.durationMonths?.message} {...register('durationMonths')} />
      </form>
    </AppScreen>
  )
}
