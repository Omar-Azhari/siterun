import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { Screen } from '@/components/layout/Screen'
import { Button, OtpInput, ScreenTitle, useToast } from '@/components/ui'
import { getApi, isDemo } from '@/data/client'
import { DEMO_OTP } from '@/data/demo/demoApi'
import { useApiMutation, useMe } from '@/data/hooks'

const RESEND_SECONDS = 30

/** Board 01 · OTP Verification */
export function VerifyPage() {
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const navigate = useNavigate()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [seconds, setSeconds] = useState(RESEND_SECONDS)
  const me = useMe()

  useEffect(() => {
    if (seconds <= 0) return
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [seconds])

  const verify = useApiMutation((api, c: string) => api.verifyOtp(email, c), { silent: true })
  const resend = useApiMutation((api) => api.resendOtp(email), {
    success: 'We’ve sent you a new code',
  })

  // Arriving from the email's confirmation link signs the user in straight away.
  if (me.data?.profile.emailVerified) return <Navigate to="/onboarding/business" replace />
  if (!email) return <Navigate to="/signup/role" replace />

  const submit = (c = code) => {
    if (c.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }
    setError(undefined)
    verify.mutate(c, {
      onSuccess: () => {
        toast.success('Email verified')
        navigate('/onboarding/business', { replace: true })
      },
      onError: (e) => {
        setError(e.message)
        setCode('')
      },
    })
  }

  return (
    <Screen
      header={{ bell: false }}
      footer={
        <>
          <Button arrow onClick={() => submit()} loading={verify.isPending}>
            Verify &amp; Continue
          </Button>
          <p className="flex items-center justify-center gap-2 pt-4 text-xs text-[#dae4ef]">
            <ShieldCheck className="size-5 shrink-0" strokeWidth={1.5} aria-hidden />
            Your information is secure and encrypted.
          </p>
        </>
      }
    >
      <ScreenTitle
        title="Verify your account"
        subtitle={
          <>
            We&apos;ve sent a 6-digit code to <span className="break-all text-fg">{email}</span>
          </>
        }
      />
      <div className="mt-6">
        <OtpInput
          value={code}
          onChange={setCode}
          error={error}
          onComplete={submit}
          autoFocus
          disabled={verify.isPending}
        />
      </div>
      <div className="mt-8 text-center text-sm text-[#dae4ef]">
        <p>Didn&apos;t receive the code?</p>
        {seconds > 0 ? (
          <p className="mt-1" aria-live="polite">
            Resend in {seconds}s
          </p>
        ) : (
          <button
            type="button"
            className="mt-1 min-h-11 px-3 font-semibold text-primary hover:underline"
            onClick={() =>
              resend.mutate(undefined, { onSuccess: () => setSeconds(RESEND_SECONDS) })
            }
            disabled={resend.isPending}
          >
            Resend code
          </button>
        )}
      </div>
      {isDemo(getApi()) && (
        <p className="mt-6 rounded-lg border border-line bg-card px-3 py-2 text-center text-xs text-muted">
          Demo mode: use code <span className="font-mono text-fg">{DEMO_OTP}</span>
        </p>
      )}
    </Screen>
  )
}
