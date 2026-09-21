import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Lock } from 'lucide-react'
import type {
  StripeCardCvcElement,
  StripeCardExpiryElement,
  StripeCardNumberElement,
  StripeElementChangeEvent,
} from '@stripe/stripe-js'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, InfoNote, Input, ScreenTitle } from '@/components/ui'
import { controlClass } from '@/components/ui/form/fieldStyles'
import { useToast } from '@/components/ui/toast/toastContext'
import { getApi } from '@/data/client'
import { getStripe } from '@/lib/stripe'
import { safeNextPath } from '@/lib/safePath'

type Key = 'number' | 'expiry' | 'cvc'

/** Matches the app's inputs inside Stripe's own card fields. */
const STYLE = {
  base: {
    color: '#ffffff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: '16px',
    fontSmoothing: 'antialiased',
    iconColor: '#aeb9c9',
    '::placeholder': { color: '#7f8a9b' },
  },
  invalid: { color: '#f87171', iconColor: '#f87171' },
}

/**
 * Card form for real payments. The number, expiry and CVC are Stripe fields (iframes from
 * js.stripe.com): the card goes straight to Stripe and SiteRun's code never sees it.
 */
export function StripeCardForm() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const toast = useToast()
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const [focus, setFocus] = useState<Key | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Key, string>>>({})
  const [complete, setComplete] = useState<Record<Key, boolean>>({
    number: false,
    expiry: false,
    cvc: false,
  })
  const mounts = {
    number: useRef<HTMLDivElement>(null),
    expiry: useRef<HTMLDivElement>(null),
    cvc: useRef<HTMLDivElement>(null),
  }
  const fields = useRef<{
    number?: StripeCardNumberElement
    expiry?: StripeCardExpiryElement
    cvc?: StripeCardCvcElement
  }>({})

  useEffect(() => {
    let cancelled = false
    void getStripe()
      .then((stripe) => {
        if (cancelled) return
        if (!stripe || !mounts.number.current || !mounts.expiry.current || !mounts.cvc.current) {
          setUnavailable(true)
          return
        }
        // No web font inside Stripe's fields: loading one would mean fetching from Google,
        // which the Content-Security-Policy (and the privacy policy) leave out.
        const elements = stripe.elements({ locale: 'en-AU' })
        const number = elements.create('cardNumber', {
          style: STYLE,
          showIcon: true,
          placeholder: '1234 5678 9012 3456',
        })
        const expiry = elements.create('cardExpiry', { style: STYLE, placeholder: 'MM/YY' })
        const cvc = elements.create('cardCvc', { style: STYLE, placeholder: '123' })
        const wire = (
          key: Key,
          field: StripeCardNumberElement | StripeCardExpiryElement | StripeCardCvcElement,
        ) => {
          // The three card fields share these events; Stripe's types just don't union them.
          const el = field as StripeCardNumberElement
          el.on('focus', () => setFocus(key))
          el.on('blur', () => setFocus((f) => (f === key ? null : f)))
          el.on('change', (e: StripeElementChangeEvent) => {
            setComplete((c) => ({ ...c, [key]: e.complete }))
            setErrors((x) => ({ ...x, [key]: e.error?.message }))
          })
        }
        wire('number', number)
        wire('expiry', expiry)
        wire('cvc', cvc)
        number.mount(mounts.number.current)
        expiry.mount(mounts.expiry.current)
        cvc.mount(mounts.cvc.current)
        fields.current = { number, expiry, cvc }
      })
      .catch(() => !cancelled && setUnavailable(true))
    return () => {
      cancelled = true
      fields.current.number?.destroy()
      fields.current.expiry?.destroy()
      fields.current.cvc?.destroy()
      fields.current = {}
    }
    // The mount points are stable refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = (key: Key, empty: string) =>
    errors[key] ?? (submitted && !complete[key] ? empty : undefined)
  const nameError = submitted && name.trim().length < 2 ? 'Enter the name on the card' : undefined

  const submit = async () => {
    setSubmitted(true)
    const card = fields.current.number
    if (!card || name.trim().length < 2 || !complete.number || !complete.expiry || !complete.cvc)
      return
    setSaving(true)
    try {
      const stripe = await getStripe()
      if (!stripe) throw new Error('Card payments aren’t available right now.')
      const api = getApi()
      const { clientSecret } = await api.startCardSetup()
      const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card, billing_details: { name: name.trim() } },
      })
      if (error || !setupIntent) throw new Error(error?.message ?? 'The card couldn’t be saved.')
      await api.finishCardSetup(setupIntent.id)
      await qc.invalidateQueries({ queryKey: ['paymentMethods'] })
      toast.success('Card saved')
      navigate(safeNextPath(params.get('next')) ?? '/payments', { replace: true })
    } catch (e) {
      toast.error('Card not saved', e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  const stripeField = (key: Key, label: string, error?: string) => (
    <div className="mb-3.5">
      <p className="mb-1.5 text-sm text-[#dae4ef]">{label}</p>
      <div
        className={controlClass(error)}
        style={
          focus === key
            ? { borderColor: 'var(--color-primary)', boxShadow: '0 0 0 1px var(--color-primary)' }
            : undefined
        }
      >
        <div ref={mounts[key]} className="w-full" aria-label={label} />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-[#f87171]">
          {error}
        </p>
      )}
    </div>
  )

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow onClick={() => void submit()} loading={saving} disabled={unavailable}>
          Save Card
        </Button>
      }
    >
      <ScreenTitle title="Add Card" subtitle="Save a card for bookings, plans and SiteCredits." />
      {unavailable ? (
        <InfoNote>
          Card payments aren’t available right now. Check your connection and try again.
        </InfoNote>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
          noValidate
        >
          {stripeField('number', 'Card number', shown('number', 'Enter your card number'))}
          <Input
            label="Name on card"
            autoComplete="cc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={nameError}
          />
          <div className="grid grid-cols-2 gap-3">
            {stripeField('expiry', 'Expiry', shown('expiry', 'Use MM/YY'))}
            {stripeField('cvc', 'CVC', shown('cvc', 'Enter the 3 or 4 digit code'))}
          </div>
          <button type="submit" hidden />
        </form>
      )}
      <InfoNote icon={<Lock className="size-5" />}>
        Card details go straight to Stripe, our payment provider. SiteRun keeps only the card brand,
        last 4 digits and expiry.
      </InfoNote>
    </AppScreen>
  )
}
