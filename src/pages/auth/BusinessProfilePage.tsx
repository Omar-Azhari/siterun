import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { phoneSchema } from './authShared'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Navigate, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { AddressAutocomplete } from '@/components/domain/AddressAutocomplete'
import {
  Button,
  formatAuMobile,
  Input,
  PhoneField,
  ScreenTitle,
  type CountryCode,
} from '@/components/ui'
import { COUNTRIES } from '@/components/ui/form/phone'
import { formatAbn, isValidAbn } from '@/lib/abn'
import { useApiMutation, useMe } from '@/data/hooks'
import { homePathFor } from '@/auth/roles'
import { FullPageSpinner } from '@/auth/guards'

const schema = z.object({
  companyName: z.string().trim().min(2, 'Enter your company name'),
  abn: z.string().refine(isValidAbn, 'Enter a valid 11-digit ABN'),
  contactName: z.string().trim().min(2, 'Enter a contact name'),
  email: z.email('Enter a valid email address'),
  phone: phoneSchema,
  address: z.string().trim().min(5, 'Enter your business address'),
})
type Values = z.infer<typeof schema>

/** Board 01 · Business Profile */
export function BusinessProfilePage() {
  const { data: me, isPending } = useMe()
  const navigate = useNavigate()
  const [country, setCountry] = useState<CountryCode>('AU')
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      companyName: '',
      abn: '',
      contactName: me?.profile.fullName ?? '',
      email: me?.profile.email ?? '',
      phone: me?.profile.phone.replace(/^\+\d+\s*/, '') ?? '',
      address: '',
    },
    resetOptions: { keepDirtyValues: true },
  })
  const save = useApiMutation(
    (api, v: Values) =>
      api.completeBusinessProfile({
        ...v,
        abn: formatAbn(v.abn),
        phone: `${COUNTRIES.find((c) => c.code === country)?.dial ?? '+61'} ${v.phone}`,
      }),
    { success: 'Business profile saved' },
  )

  if (isPending) return <FullPageSpinner />
  if (!me) return <Navigate to="/login" replace />
  if (me.org) return <Navigate to={homePathFor(me)} replace />

  const onSubmit = handleSubmit((v) =>
    save.mutate(v, {
      onSuccess: (org) =>
        navigate(org.kind === 'supplier' ? '/supplier' : '/sites/new/location', { replace: true }),
    }),
  )

  return (
    <Screen header={{ bell: false, leading: 'none' }}>
      <ScreenTitle
        title="Tell us about your business"
        subtitle="Add your business details to complete setup."
      />
      <form onSubmit={onSubmit} noValidate>
        <Input
          label="Company name"
          autoComplete="organization"
          placeholder="BuildCo Pty Ltd"
          error={errors.companyName?.message}
          {...register('companyName')}
        />
        <Controller
          control={control}
          name="abn"
          render={({ field }) => (
            <Input
              label="ABN"
              inputMode="numeric"
              placeholder="12 345 678 901"
              value={field.value}
              onChange={(e) => field.onChange(formatAbn(e.target.value))}
              onBlur={field.onBlur}
              valid={isValidAbn(field.value)}
              error={errors.abn?.message}
            />
          )}
        />
        <Input
          label="Contact name"
          autoComplete="name"
          error={errors.contactName?.message}
          {...register('contactName')}
        />
        <Input
          label="Business email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Controller
          control={control}
          name="phone"
          render={({ field }) => (
            <PhoneField
              country={country}
              onCountryChange={setCountry}
              value={field.value}
              onChange={(e) => field.onChange(formatAuMobile(e.target.value))}
              onBlur={field.onBlur}
              error={errors.phone?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="address"
          render={({ field }) => (
            <AddressAutocomplete
              label="Business address"
              value={field.value}
              onChange={field.onChange}
              onSelect={(p) => field.onChange(p.label)}
              placeholder="45 Industry Rd, Melbourne VIC"
              error={errors.address?.message}
            />
          )}
        />
        <Button type="submit" arrow loading={save.isPending} className="mt-2">
          Complete Setup
        </Button>
      </form>
    </Screen>
  )
}
