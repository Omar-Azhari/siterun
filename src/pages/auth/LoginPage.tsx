import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { Screen } from '@/components/layout/Screen'
import {
  AppleIcon,
  Button,
  Checkbox,
  GoogleIcon,
  Input,
  OrDivider,
  PasswordInput,
  ScreenTitle,
} from '@/components/ui'
import { getApi, isDemo } from '@/data/client'
import { useApiMutation } from '@/data/hooks'
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/data/seed'

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})
type Values = z.infer<typeof schema>

/** Board 01 · Log In. Redirect after login is handled by the PublicOnly guard. */
export function LoginPage() {
  const [keep, setKeep] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const login = useApiMutation((api, v: Values) => api.signIn(v.email, v.password, keep), {
    silent: true,
  })
  const social = useApiMutation((api, p: 'google' | 'apple') => api.signInWithProvider(p))

  const onSubmit = handleSubmit((v) => {
    setError(null)
    login.mutate(v, { onError: (e) => setError(e.message) })
  })

  return (
    <Screen header={{ bell: false, leading: 'none' }}>
      <ScreenTitle title="Welcome back" subtitle="Log in to your account." />
      <form onSubmit={onSubmit} noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="jamie.carter@buildco.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="-mt-2 mb-3 flex items-center justify-between">
          <Checkbox checked={keep} onChange={setKeep}>
            Keep me signed in
          </Checkbox>
          <Link to="/forgot-password" className="py-3 text-[13px] text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-[#fca5a5]"
          >
            {error}
          </p>
        )}
        <Button type="submit" arrow loading={login.isPending}>
          Log In
        </Button>
      </form>
      <OrDivider />
      <div className="space-y-2.5">
        <Button
          variant="outline"
          leftIcon={<GoogleIcon className="absolute left-4 size-6" />}
          onClick={() => social.mutate('google')}
          loading={social.isPending && social.variables === 'google'}
        >
          Continue with Google
        </Button>
        <Button
          variant="outline"
          leftIcon={<AppleIcon className="absolute left-4 size-6" />}
          onClick={() => social.mutate('apple')}
          loading={social.isPending && social.variables === 'apple'}
        >
          Continue with Apple
        </Button>
      </div>
      <p className="mt-6 text-center text-[13px] text-[#dae4ef]">
        Don&apos;t have an account?{' '}
        <Link to="/signup/role" className="font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
      {isDemo(getApi()) && (
        <details className="group mt-8 rounded-xl border border-line bg-card p-3 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
            Demo accounts
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="mt-1 text-xs text-muted">
            Password for all: <code className="text-fg">{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-2 space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-white/5"
                  onClick={() => {
                    setValue('email', a.email)
                    setValue('password', DEMO_PASSWORD)
                  }}
                >
                  <span>
                    <span className="block text-fg">{a.role}</span>
                    <span className="block text-xs text-muted">{a.email}</span>
                  </span>
                  <span className="text-xs text-primary">Use</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Screen>
  )
}
