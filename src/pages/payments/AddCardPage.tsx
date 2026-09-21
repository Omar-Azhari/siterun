import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CreditCard, Lock } from 'lucide-react'
import { AppScreen } from '@/components/layout/AppScreen'
import { Button, InfoNote, Input, ScreenTitle } from '@/components/ui'
import { cardBrand, luhnValid, parseExpiry } from '@/lib/cards'
import { safeNextPath } from '@/lib/safePath'
import { getApi } from '@/data/client'
import { useApiMutation } from '@/data/hooks'
import { BrandMark } from '@/components/domain/BrandMark'
import { StripeCardForm } from './StripeCardForm'

/** Where to go after saving: back to the screen that sent the user here, or Payments. */
const afterCardPath = (next: string | null) => safeNextPath(next) ?? '/payments'

export function AddCardPage() {
  return getApi().payments === 'stripe' ? <StripeCardForm /> : <MockAddCardPage />
}

/**
 * Mock card form (demo, and until Stripe is configured). The full number and CVC exist
 * only in this component's state and are never sent anywhere: only brand, last 4 and
 * expiry reach the Api.
 */
function MockAddCardPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [exp, setExp] = useState('')
  const [cvc, setCvc] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const add = useApiMutation(
    (api, v: Parameters<typeof api.addPaymentMethod>[0]) => api.addPaymentMethod(v),
    { success: 'Card saved' },
  )

  const digits = number.replace(/\D/g, '')
  const brand = cardBrand(digits)
  const expiry = parseExpiry(exp)
  const errors = submitted
    ? {
        number: !luhnValid(digits)
          ? 'Enter a valid card number'
          : !brand
            ? 'We accept Visa, Mastercard and Amex'
            : undefined,
        name: name.trim().length < 2 ? 'Enter the name on the card' : undefined,
        exp: !expiry ? 'Use MM/YY' : expiry.expired ? 'This card has expired' : undefined,
        cvc: !/^\d{3,4}$/.test(cvc) ? 'Enter the 3 or 4 digit code' : undefined,
      }
    : {}

  const submit = () => {
    setSubmitted(true)
    if (
      !luhnValid(digits) ||
      !brand ||
      name.trim().length < 2 ||
      !expiry ||
      expiry.expired ||
      !/^\d{3,4}$/.test(cvc)
    )
      return
    add.mutate(
      { brand, last4: digits.slice(-4), expMonth: expiry.month, expYear: expiry.year },
      {
        onSuccess: () => {
          setNumber('')
          setCvc('')
          navigate(afterCardPath(params.get('next')), { replace: true })
        },
      },
    )
  }

  return (
    <AppScreen
      hideNav
      footer={
        <Button arrow onClick={submit} loading={add.isPending}>
          Save Card
        </Button>
      }
    >
      <ScreenTitle title="Add Card" subtitle="Save a card for bookings, plans and SiteCredits." />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
        noValidate
      >
        <Input
          label="Card number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          value={number}
          onChange={(e) =>
            setNumber(
              e.target.value
                .replace(/\D/g, '')
                .slice(0, 19)
                .replace(/(.{4})/g, '$1 ')
                .trim(),
            )
          }
          leftIcon={
            brand ? (
              <BrandMark brand={brand} className="h-6 w-9" />
            ) : (
              <CreditCard strokeWidth={1.75} />
            )
          }
          error={errors.number}
        />
        <Input
          label="Name on card"
          autoComplete="cc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            value={exp}
            onChange={(e) => {
              const d = e.target.value.replace(/\D/g, '').slice(0, 4)
              setExp(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d)
            }}
            error={errors.exp}
          />
          <Input
            label="CVC"
            inputMode="numeric"
            autoComplete="cc-csc"
            type="password"
            maxLength={4}
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))}
            error={errors.cvc}
          />
        </div>
        <button type="submit" hidden />
      </form>
      <InfoNote icon={<Lock className="size-5" />}>
        Demo mode: payments are simulated. SiteRun only keeps the card brand, last 4 digits and
        expiry. The full number and CVC are never stored.
      </InfoNote>
    </AppScreen>
  )
}
