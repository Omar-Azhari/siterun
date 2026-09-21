/** Stripe's publishable key (public by design). Card payments are real only with it set. */
export const STRIPE_PUBLISHABLE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '') as string
