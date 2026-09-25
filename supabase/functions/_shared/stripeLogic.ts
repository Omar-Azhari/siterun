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
  | { action: 'connect-start'; returnPath: string }
  | { action: 'connect-status' }
  | { action: 'payout'; idempotencyKey: string }
  | { action: 'refund'; paymentId: string; amountCents: number; reason: string }

/** A path back into the app, used for Stripe's onboarding return links. */
export function safePath(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^\/(?![/\\])[\w\-/?=&.]*$/.test(value) && value.length <= 120
    ? value
    : fallback
}

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
    case 'connect-start':
      return { action: 'connect-start', returnPath: safePath(b.returnPath, '/supplier/payouts') }
    case 'connect-status':
      return { action: 'connect-status' }
    case 'payout':
      return typeof b.idempotencyKey === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(b.idempotencyKey)
        ? { action: 'payout', idempotencyKey: b.idempotencyKey }
        : { error: 'Bad request.' }
    case 'refund': {
      if (typeof b.paymentId !== 'string' || !UUID.test(b.paymentId))
        return { error: 'Bad request.' }
      if (
        typeof b.amountCents !== 'number' ||
        !Number.isInteger(b.amountCents) ||
        b.amountCents < 1
      ) {
        return { error: 'Enter an amount above $0.' }
      }
      const reason = typeof b.reason === 'string' ? b.reason.trim() : ''
      if (reason.length < 5 || reason.length > 200)
        return { error: 'Say why the money is being refunded.' }
      return { action: 'refund', paymentId: b.paymentId, amountCents: b.amountCents, reason }
    }
    default:
      return { error: 'Bad request.' }
  }
}
