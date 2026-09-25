// Card payments through Stripe, for the signed-in user's organisation.
//
//   setup           start a SetupIntent so Stripe's card fields can save a card
//   save            record a card Stripe has confirmed (brand, last 4, expiry, Stripe id)
//   pay             charge a saved card towards the account balance
//   confirm         finish a charge after the bank's 3-D Secure check
//   remove          detach a card from Stripe and delete it
//   connect-start   link a supplier to a Stripe account so they can be paid
//   connect-status  refresh whether that account can receive payouts yet
//   payout          transfer what a supplier has earned to their Stripe account
//   refund          (platform admin) refund part or all of a payment
//
// Every action first asks the database who the caller is (payment_context, run as the
// caller), so a request can only ever touch its own organisation. Amounts come from the
// database and Stripe, never from the browser alone.
//
// Secrets: STRIPE_SECRET_KEY, ALLOWED_ORIGINS. See LAUNCH.md.
import Stripe from 'npm:stripe@17'
import { admin, asCaller } from '../_shared/clients.ts'
import { allowedOrigins, corsHeaders, json } from '../_shared/http.ts'
import { cardBrand, parseAction } from '../_shared/stripeLogic.ts'

const secret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const stripe = secret
  ? new Stripe(secret, { httpClient: Stripe.createFetchHttpClient(), maxNetworkRetries: 2 })
  : null
const origins = allowedOrigins(Deno.env.get('ALLOWED_ORIGINS'))

type PayoutContext = {
  org_id: string
  org_name: string
  email: string
  profile_id: string
  isOwner: boolean
  connected: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
  available_cents: number
  account_id: string | null
}

type Context = {
  org_id: string
  org_name: string
  email: string
  can_manage_cards: boolean
  balance: number
  customer_id: string | null
}

class Refused extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function context(caller: NonNullable<ReturnType<typeof asCaller>>): Promise<Context> {
  const { data, error } = await caller.rpc('payment_context')
  if (error || !data) throw new Refused(error?.message ?? 'Sign in again.', 401)
  return data as Context
}

async function limit(caller: NonNullable<ReturnType<typeof asCaller>>) {
  const { error } = await caller.rpc('payment_attempt')
  if (error) throw new Refused(error.message, error.code === 'PT429' ? 429 : 400)
}

async function customerFor(client: Stripe, ctx: Context): Promise<string> {
  if (ctx.customer_id) return ctx.customer_id
  const customer = await client.customers.create(
    { name: ctx.org_name, email: ctx.email, metadata: { org_id: ctx.org_id } },
    // Two tabs adding a card at once still end up with one customer.
    { idempotencyKey: `customer-${ctx.org_id}` },
  )
  const { error } = await admin.rpc('stripe_set_customer', {
    p_org: ctx.org_id,
    p_customer: customer.id,
  })
  if (error) throw new Error(error.message)
  return customer.id
}

async function payoutContext(
  caller: NonNullable<ReturnType<typeof asCaller>>,
): Promise<PayoutContext> {
  const { data, error } = await caller.rpc('payout_context')
  if (error || !data) throw new Refused(error?.message ?? 'Sign in again.', 401)
  return data as PayoutContext
}

/** Where Stripe sends the supplier back to after its onboarding pages. */
function siteUrl(req: Request, path: string): string {
  const origin = req.headers.get('Origin')
  const base =
    origin && origins.includes(origin)
      ? origin
      : (origins.find((o) => o.startsWith('https://') && !o.includes('localhost')) ?? origins[0])
  return `${base}${path}`
}

async function apply(orgId: string, pi: Stripe.PaymentIntent) {
  const { error } = await admin.rpc('stripe_apply_payment', {
    p_org: orgId,
    p_amount: pi.amount,
    p_card_ref: String(pi.metadata.card_ref ?? ''),
    p_intent: pi.id,
  })
  if (error) throw new Error(error.message)
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req.headers.get('Origin'), origins)
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, cors)

  const caller = asCaller(req)
  if (!caller) return json({ error: 'Sign in first.' }, 401, cors)
  if (!stripe) return json({ error: 'Card payments aren’t set up yet.' }, 503, cors)

  const parsed = parseAction(await req.json().catch(() => null))
  if ('error' in parsed) return json({ error: parsed.error }, 400, cors)

  try {
    switch (parsed.action) {
      case 'setup': {
        // Only the card actions need the payment context; a platform admin issuing a
        // refund has no organisation of their own.
        const ctx = await context(caller)
        if (!ctx.can_manage_cards)
          throw new Refused('Only the owner or a project manager can add cards.', 403)
        await limit(caller)
        const customer = await customerFor(stripe, ctx)
        const si = await stripe.setupIntents.create({
          customer,
          usage: 'off_session',
          payment_method_types: ['card'],
          metadata: { org_id: ctx.org_id },
        })
        return json({ clientSecret: si.client_secret }, 200, cors)
      }

      case 'save': {
        const ctx = await context(caller)
        if (!ctx.can_manage_cards)
          throw new Refused('Only the owner or a project manager can add cards.', 403)
        const si = await stripe.setupIntents.retrieve(parsed.setupIntentId, {
          expand: ['payment_method'],
        })
        if (
          si.metadata?.org_id !== ctx.org_id ||
          !ctx.customer_id ||
          si.customer !== ctx.customer_id
        ) {
          throw new Refused('Card not found.', 404)
        }
        if (si.status !== 'succeeded')
          throw new Refused('The card wasn’t confirmed. Try again.', 400)
        const pm = si.payment_method as Stripe.PaymentMethod | null
        const brand = cardBrand(pm?.card?.brand)
        if (!pm?.card || !brand) {
          if (pm) await stripe.paymentMethods.detach(pm.id).catch(() => {})
          throw new Refused('We accept Visa, Mastercard and Amex.', 400)
        }
        const { data, error } = await admin.rpc('stripe_record_card', {
          p_org: ctx.org_id,
          p_ref: pm.id,
          p_brand: brand,
          p_last4: pm.card.last4,
          p_exp_month: pm.card.exp_month,
          p_exp_year: pm.card.exp_year,
        })
        if (error) throw new Error(error.message)
        return json({ card: data }, 200, cors)
      }

      case 'pay': {
        const ctx = await context(caller)
        if (parsed.amountCents > ctx.balance)
          throw new Refused('That’s more than your balance.', 400)
        await limit(caller)
        const { data: card } = await admin.rpc('stripe_card', {
          p_org: ctx.org_id,
          p_method: parsed.methodId,
        })
        const ref = (card as { provider_ref?: string } | null)?.provider_ref
        if (!ref || !ctx.customer_id) throw new Refused('Choose a saved card.', 400)
        let pi: Stripe.PaymentIntent
        try {
          pi = await stripe.paymentIntents.create(
            {
              amount: parsed.amountCents,
              currency: 'aud',
              customer: ctx.customer_id,
              payment_method: ref,
              payment_method_types: ['card'],
              confirm: true,
              description: `SiteRun account payment · ${ctx.org_name}`,
              metadata: { org_id: ctx.org_id, card_ref: ref, kind: 'balance' },
            },
            // A double tap or a retried request charges once.
            { idempotencyKey: `pay-${ctx.org_id}-${parsed.idempotencyKey}` },
          )
        } catch (e) {
          if (e instanceof Stripe.errors.StripeCardError) throw new Refused(e.message, 402)
          throw e
        }
        if (pi.status === 'succeeded') {
          await apply(ctx.org_id, pi)
          return json({ status: 'succeeded', paymentIntentId: pi.id }, 200, cors)
        }
        if (pi.status === 'requires_action') {
          return json(
            { status: pi.status, clientSecret: pi.client_secret, paymentIntentId: pi.id },
            200,
            cors,
          )
        }
        return json({ status: pi.status, paymentIntentId: pi.id }, 200, cors)
      }

      case 'confirm': {
        const ctx = await context(caller)
        const pi = await stripe.paymentIntents.retrieve(parsed.paymentIntentId)
        if (pi.metadata?.org_id !== ctx.org_id) throw new Refused('Payment not found.', 404)
        if (pi.status === 'succeeded') await apply(ctx.org_id, pi)
        return json({ status: pi.status }, 200, cors)
      }

      case 'connect-start': {
        const ctx = await payoutContext(caller)
        if (!ctx.isOwner) throw new Refused('Only the owner can set up payouts.', 403)
        await limit(caller)
        let account = ctx.account_id
        if (!account) {
          const created = await stripe.accounts.create(
            {
              type: 'express',
              country: 'AU',
              email: ctx.email,
              business_profile: {
                name: ctx.org_name,
                product_description: 'Construction equipment hire',
              },
              capabilities: { transfers: { requested: true } },
              metadata: { org_id: ctx.org_id },
            },
            { idempotencyKey: `account-${ctx.org_id}` },
          )
          account = created.id
          const { error } = await admin.rpc('stripe_set_account', {
            p_org: ctx.org_id,
            p_account: account,
          })
          if (error) throw new Error(error.message)
        }
        const link = await stripe.accountLinks.create({
          account,
          type: 'account_onboarding',
          refresh_url: siteUrl(req, parsed.returnPath),
          return_url: siteUrl(req, parsed.returnPath),
        })
        return json({ url: link.url }, 200, cors)
      }

      case 'connect-status': {
        const ctx = await payoutContext(caller)
        if (!ctx.account_id) {
          return json(
            { connected: false, payoutsEnabled: false, detailsSubmitted: false },
            200,
            cors,
          )
        }
        const account = await stripe.accounts.retrieve(ctx.account_id)
        const { error } = await admin.rpc('stripe_update_account', {
          p_account: account.id,
          p_payouts_enabled: !!account.payouts_enabled,
          p_details_submitted: !!account.details_submitted,
        })
        if (error) throw new Error(error.message)
        return json(
          {
            connected: true,
            payoutsEnabled: !!account.payouts_enabled,
            detailsSubmitted: !!account.details_submitted,
            // What Stripe still wants from the supplier, if anything.
            requirements: account.requirements?.currently_due ?? [],
          },
          200,
          cors,
        )
      }

      case 'payout': {
        const ctx = await payoutContext(caller)
        if (!ctx.isOwner) throw new Refused('Only the owner can request payouts.', 403)
        if (!ctx.account_id || !ctx.payoutsEnabled) {
          throw new Refused('Finish setting up payouts with Stripe first.', 400)
        }
        if (ctx.available_cents <= 0) {
          throw new Refused('There is nothing available to pay out yet.', 400)
        }
        await limit(caller)
        let transfer: Stripe.Transfer
        try {
          transfer = await stripe.transfers.create(
            {
              amount: ctx.available_cents,
              currency: 'aud',
              destination: ctx.account_id,
              description: `SiteRun payout · ${ctx.org_name}`,
              metadata: { org_id: ctx.org_id },
            },
            { idempotencyKey: `payout-${ctx.org_id}-${parsed.idempotencyKey}` },
          )
        } catch (e) {
          if (
            e instanceof Stripe.errors.StripeInvalidRequestError &&
            e.code === 'balance_insufficient'
          ) {
            throw new Refused(
              'Payments from this week have not settled yet. Try again tomorrow.',
              409,
            )
          }
          throw e
        }
        const { data, error } = await admin.rpc('stripe_record_payout', {
          p_org: ctx.org_id,
          p_amount: transfer.amount,
          p_by: ctx.profile_id,
          p_transfer: transfer.id,
        })
        if (error) throw new Error(error.message)
        return json({ payout: data }, 200, cors)
      }

      case 'refund': {
        // admin_refund_context runs as the caller, so it refuses anyone who isn't an admin.
        const { data, error: ctxError } = await caller.rpc('admin_refund_context', {
          p_payment: parsed.paymentId,
        })
        if (ctxError || !data) throw new Refused(ctxError?.message ?? 'Payment not found.', 403)
        const refundCtx = data as {
          admin_id: string
          provider_ref: string | null
          refundable_cents: number
        }
        if (parsed.amountCents > refundCtx.refundable_cents) {
          throw new Refused('That is more than is left to refund.', 400)
        }
        if (!refundCtx.provider_ref) {
          throw new Refused('That payment was not made by card through Stripe.', 400)
        }
        const refund = await stripe.refunds.create(
          {
            payment_intent: refundCtx.provider_ref,
            amount: parsed.amountCents,
            reason: 'requested_by_customer',
            metadata: { payment_id: parsed.paymentId },
          },
          { idempotencyKey: `refund-${parsed.paymentId}-${parsed.amountCents}` },
        )
        const { error } = await admin.rpc('stripe_record_refund', {
          p_admin: refundCtx.admin_id,
          p_payment: parsed.paymentId,
          p_amount: parsed.amountCents,
          p_reason: parsed.reason,
          p_ref: refund.id,
        })
        if (error) throw new Error(error.message)
        return json({ status: refund.status ?? 'pending' }, 200, cors)
      }

      case 'remove': {
        const ctx = await context(caller)
        if (!ctx.can_manage_cards)
          throw new Refused('Only the owner or a project manager can remove cards.', 403)
        const { data: card } = await admin.rpc('stripe_card', {
          p_org: ctx.org_id,
          p_method: parsed.methodId,
        })
        const row = card as { id?: string | null; provider_ref?: string | null } | null
        if (!row?.id) throw new Refused('Card not found.', 404)
        if (row.provider_ref) {
          await stripe.paymentMethods.detach(row.provider_ref).catch((e: unknown) => {
            // Already gone from Stripe: still remove it here.
            if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) throw e
          })
        }
        const { error } = await admin.rpc('stripe_delete_card', {
          p_org: ctx.org_id,
          p_method: parsed.methodId,
        })
        if (error) throw new Error(error.message)
        return json({ status: 'removed' }, 200, cors)
      }
    }
  } catch (e) {
    if (e instanceof Refused) return json({ error: e.message }, e.status, cors)
    console.error('payments failed', e instanceof Error ? e.message : e)
    return json({ error: 'The payment service hit a problem. Try again.' }, 500, cors)
  }
})
