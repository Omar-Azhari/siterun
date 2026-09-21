import type { Stripe } from '@stripe/stripe-js'
import { STRIPE_PUBLISHABLE_KEY } from '@/data/stripeConfig'

let stripe: Promise<Stripe | null> | null = null

/**
 * Stripe.js, loaded from js.stripe.com the first time a card screen or a payment needs
 * it (Stripe requires it to come from their servers). Null when no key is configured.
 */
export function getStripe(): Promise<Stripe | null> {
  if (!STRIPE_PUBLISHABLE_KEY) return Promise.resolve(null)
  stripe ??= import('@stripe/stripe-js').then(({ loadStripe }) =>
    loadStripe(STRIPE_PUBLISHABLE_KEY, { locale: 'en-AU' }),
  )
  return stripe
}
