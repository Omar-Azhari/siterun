// Rules for the payments functions that don't need Stripe itself. No Deno or npm
// imports, so Vitest can test them.

export type CardBrand = 'visa' | 'mastercard' | 'amex'

/** SiteRun takes Visa, Mastercard and Amex (the card_brand enum). Anything else: null. */
export function cardBrand(stripeBrand: string | null | undefined): CardBrand | null {
  switch (stripeBrand) {
    case 'visa':
    case 'mastercard':
    case 'amex':
      return stripeBrand
    default:
      return null
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type Action =
  | { action: 'setup' }
  | { action: 'save'; setupIntentId: string }
  | { action: 'pay'; amountCents: number; methodId: string; idempotencyKey: string }
  | { action: 'confirm'; paymentIntentId: string }
  | { action: 'remove'; methodId: string }

/** Validates a request body. Returns the action, or a message for a 400 response. */
export function parseAction(body: unknown): Action | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Bad request.' }
  const b = body as Record<string, unknown>
  switch (b.action) {
    case 'setup':
      return { action: 'setup' }
    case 'save':
      return typeof b.setupIntentId === 'string' && /^seti_[A-Za-z0-9]+$/.test(b.setupIntentId)
        ? { action: 'save', setupIntentId: b.setupIntentId }
        : { error: 'Bad request.' }
    case 'pay': {
      const amount = b.amountCents
      if (
        typeof amount !== 'number' ||
        !Number.isInteger(amount) ||
        amount < 50 ||
        amount > 100_000_000
      ) {
        // Stripe's minimum charge in AUD is 50 cents.
        return { error: 'Enter an amount of at least $0.50.' }
      }
      if (typeof b.methodId !== 'string' || !UUID.test(b.methodId))
        return { error: 'Choose a saved card.' }
      if (typeof b.idempotencyKey !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(b.idempotencyKey)) {
        return { error: 'Bad request.' }
      }
      return {
        action: 'pay',
        amountCents: amount,
        methodId: b.methodId,
        idempotencyKey: b.idempotencyKey,
      }
    }
    case 'confirm':
      return typeof b.paymentIntentId === 'string' && /^pi_[A-Za-z0-9]+$/.test(b.paymentIntentId)
        ? { action: 'confirm', paymentIntentId: b.paymentIntentId }
        : { error: 'Bad request.' }
    case 'remove':
      return typeof b.methodId === 'string' && UUID.test(b.methodId)
        ? { action: 'remove', methodId: b.methodId }
        : { error: 'Bad request.' }
    default:
      return { error: 'Bad request.' }
  }
}
