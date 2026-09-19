import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Phone, User } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import {
  Button,
  formatAuMobile,
  Input,
  ScreenTitle,
  SectionLabel,
  Textarea,
  TimeField,
} from '@/components/ui'
import { useApiMutation } from '@/data/hooks'
import { accessSchema, useSiteDraft, type AccessValues } from './siteDraft'

export function AccessFields({
  control,
  errors,
  register,
}: {
  control: ReturnType<typeof useForm<AccessValues>>['control']
  errors: ReturnType<typeof useForm<AccessValues>>['formState']['errors']
  register: ReturnType<typeof useForm<AccessValues>>['register']
}) {
  const notes = useWatch({ control, name: 'accessNotes' })
  return (
    <>
      <p className="mb-1.5 text-sm font-semibold">Delivery hours</p>
      <div className="flex items-start gap-2">
        <Controller
          control={control}
          name="deliveryFrom"
          render={({ field }) => (
            <TimeField
              label="From"
              hideLabel
              compact
              value={field.value}
              onChange={field.onChange}
              error={errors.deliveryFrom?.message}
              className="flex-1"
            />
          )}
        />
        <ArrowRight className="mt-3 size-4 shrink-0 text-muted" aria-hidden />
        <Controller
          control={control}
          name="deliveryTo"
          render={({ field }) => (
            <TimeField
              label="To"
              hideLabel
              compact
              value={field.value}
              onChange={field.onChange}
              error={errors.deliveryTo?.message}
              className="flex-1"
            />
          )}
        />
      </div>
      <Textarea
        label="Access notes (optional)"
        placeholder="Enter via Gate 2. Report to site office. PPE required."
        maxLength={250}
        value={notes}
        error={errors.accessNotes?.message}
        rows={4}
        {...register('accessNotes')}
      />
      <SectionLabel className="mt-4">Site contact</SectionLabel>
      <Input
        label="Contact name"
        hideLabel
        placeholder="Contact name"
        leftIcon={<User strokeWidth={1.75} />}
        error={errors.contactName?.message}
        {...register('contactName')}
      />
      <Controller
        control={control}
        name="contactPhone"
        render={({ field }) => (
          <Input
            label="Contact phone"
            hideLabel
            type="tel"
            inputMode="tel"
            placeholder="412 345 678"
            leftIcon={
              <span className="flex items-center gap-3">
                <Phone strokeWidth={1.75} />
                <span className="text-[15px] text-fg">+61</span>
              </span>
            }
            value={field.value}
            onChange={(e) => field.onChange(formatAuMobile(e.target.value))}
            onBlur={field.onBlur}
            error={errors.contactPhone?.message}
          />
        )}
      />
    </>
  )
}

/** Board 02 · Site Access Window. Creates the site. */
export function SiteAccessPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { draft, update, clear } = useSiteDraft(params.get('demo') === '1')
  const [done, setDone] = useState(false)
  const form = useForm<AccessValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      deliveryFrom: draft.deliveryFrom ?? '07:00',
      deliveryTo: draft.deliveryTo ?? '16:00',
      accessNotes: draft.accessNotes ?? '',
      contactName: draft.contactName ?? '',
      contactPhone: draft.contactPhone?.replace(/^\+61\s*/, '') ?? '',
    },
  })
  const create = useApiMutation(
    (api, v: AccessValues) =>
      api.createSite({
        name: draft.name ?? '',
        address: draft.address ?? '',
        suburb: draft.suburb ?? '',
        state: draft.state ?? 'VIC',
        postcode: draft.postcode ?? '',
        lat: draft.lat ?? 0,
        lng: draft.lng ?? 0,
        projectType: draft.projectType ?? 'Other',
        startDate: draft.startDate ?? '',
        durationMonths: draft.durationMonths ?? 6,
        status: 'planning',
        ...v,
        contactPhone: `+61 ${v.contactPhone}`,
      }),
    { success: (s) => `${s.name} created` },
  )

  if (!draft.name && !done) return <Navigate to="/sites/new/details" replace />

  const onSubmit = form.handleSubmit((v) => {
    update(v)
    create.mutate(v, {
      onSuccess: () => {
        // This page can stay mounted while the next route loads; don't send the user
        // back to step 1 once the draft is cleared.
        setDone(true)
        clear()
        navigate('/team/invite?onboarding=1')
      },
    })
  })

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow type="submit" form="site-access" loading={create.isPending}>
          Continue
        </Button>
      }
    >
      <ScreenTitle
        title="Site Access Window"
        subtitle="Let suppliers know when they can deliver and access the site."
      />
      <form id="site-access" onSubmit={onSubmit} noValidate>
        <AccessFields
          control={form.control}
          errors={form.formState.errors}
          register={form.register}
        />
      </form>
    </AppScreen>
  )
}
