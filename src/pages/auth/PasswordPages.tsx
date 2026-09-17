import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { Screen } from '@/components/layout/Screen'
import { Button, ButtonLink, Input, PasswordInput, ScreenTitle } from '@/components/ui'
import { useApiMutation } from '@/data/hooks'
import { PasswordChecklist } from '@/components/domain/PasswordChecklist'
import { passwordSchema } from './authShared'

/** Forgot password (not on the boards; styled to match board 01). */
export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.email('Enter a valid email address') })),
  })
  const send = useApiMutation((api, email: string) => api.requestPasswordReset(email))

  if (sentTo)
    return (
      <Screen header={{ bell: false }}>
        <div className="mt-8 flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/15 text-primary">
            <MailCheck className="size-10" strokeWidth={1.5} />
          </div>
          <h1 className="mt-5 font-display text-[22px] font-bold">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            If an account exists for <span className="text-fg">{sentTo}</span>, we&apos;ve sent a
            link to reset your password.
          </p>
          <ButtonLink to="/login" className="mt-8" arrow>
            Back to Log In
          </ButtonLink>
        </div>
      </Screen>
    )

  return (
    <Screen header={{ bell: false }}>
      <ScreenTitle
        title="Forgot password?"
        subtitle="Enter your email and we’ll send you a reset link."
      />
      <form
        onSubmit={handleSubmit((v) =>
          send.mutate(v.email, { onSuccess: () => setSentTo(v.email) }),
        )}
        noValidate
      >
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" arrow loading={send.isPending}>
          Send Reset Link
        </Button>
      </form>
      <p className="mt-6 text-center text-[13px] text-[#dae4ef]">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Screen>
  )
}

const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: 'Passwords don’t match', path: ['confirm'] })

/** Reset password (reached from the email link, which signs the user in). */
export function ResetPasswordPage() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const password = useWatch({ control, name: 'password' })
  const update = useApiMutation((api, pw: string) => api.updatePassword(pw), {
    success: 'Password updated',
  })

  return (
    <Screen header={{ bell: false }}>
      <ScreenTitle title="Reset your password" subtitle="Choose a new password for your account." />
      <form
        onSubmit={handleSubmit((v) =>
          update.mutate(v.password, { onSuccess: () => navigate('/', { replace: true }) }),
        )}
        noValidate
      >
        <PasswordInput
          label="New password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordChecklist value={password} />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" arrow loading={update.isPending}>
          Update Password
        </Button>
      </form>
    </Screen>
  )
}
