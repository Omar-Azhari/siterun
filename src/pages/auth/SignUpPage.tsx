import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import {
  Button,
  formatAuMobile,
  Input,
  PasswordInput,
  PhoneField,
  ScreenTitle,
  type CountryCode,
} from '@/components/ui'
import { useApiMutation } from '@/data/hooks'
import type { AccountType } from '@/data/types'
import { COUNTRIES } from '@/components/ui/form/phone'
import { PasswordChecklist } from '@/components/domain/PasswordChecklist'
import { passwordSchema, phoneSchema, ROLE_OPTIONS } from './authShared'

const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.email('Enter a valid email address'),
  phone: phoneSchema,
  password: passwordSchema,
})
type Values = z.infer<typeof schema>

/** Board 01 · Sign Up */
export function SignUpPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const role = (ROLE_OPTIONS.find((r) => r.value === params.get('role'))?.value ??
    'contractor') as AccountType
  const [country, setCountry] = useState<CountryCode>('AU')
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '', password: '' },
  })
  const password = useWatch({ control, name: 'password' })
  const signUp = useApiMutation((api, v: Values) =>
    api.signUp({
      fullName: v.fullName,
      email: v.email,
      phone: `${COUNTRIES.find((c) => c.code === country)?.dial ?? '+61'} ${v.phone}`,
      password: v.password,
      accountType: role,
    }),
  )

  const onSubmit = handleSubmit((v) =>
    signUp.mutate(v, { onSuccess: () => navigate(`/verify?email=${encodeURIComponent(v.email)}`) }),
  )

  return (
    <Screen header={{ bell: false }}>
      <ScreenTitle
        title="Create your account"
        subtitle="Get started and join the SiteRun network."
      />
      <form onSubmit={onSubmit} noValidate>
        <p className="mb-3 text-[13px] text-muted">
          Signing up as{' '}
          <span className="font-semibold text-fg">
            {ROLE_OPTIONS.find((r) => r.value === role)?.title}
          </span>
          {' · '}
          <Link to={`/signup/role?role=${role}`} className="text-primary hover:underline">
            Change
          </Link>
        </p>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Jamie Carter"
          error={errors.fullName?.message}
          {...register('fullName')}
        />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="jamie.carter@buildco.com"
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
              placeholder="412 345 678"
              error={errors.phone?.message}
            />
          )}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordChecklist value={password} />
        <Button type="submit" arrow loading={signUp.isPending}>
          Create Account
        </Button>
        <p className="mt-4 text-center text-xs leading-relaxed text-[#dae4ef]">
          By creating an account, you agree to our
          <br />
          <Link to="/terms" className="text-primary underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-4 text-center text-[13px] text-[#dae4ef]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </Screen>
  )
}
