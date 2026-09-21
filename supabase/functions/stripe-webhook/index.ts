// Stripe → SiteRun events. Stripe signs every request; anything without a valid signature
// is refused. This is the backstop for the app: if a browser closes before it confirms a
// payment or a saved card, the event records it anyway. Both paths are idempotent.
//
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET. Deployed without JWT verification
// (Stripe can't send one); the signature check below is the authentication.
import Stripe from 'npm:stripe@17'
import { admin } from '../_shared/clients.ts'
import { json } from '../_shared/http.ts'
import { cardBrand } from '../_shared/stripeLogic.ts'

const secret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const signingSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const stripe = secret ? new Stripe(secret, { httpClient: Stripe.createFetchHttpClient() }) : null
const cryptoProvider = Stripe.createSubtleCryptoProvider()

/** The organisation Stripe says this customer belongs to, if it matches our records. */
async function orgFor(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  claimed: string | undefined,
) {
  const id = typeof customer === 'string' ? customer : customer?.id
  if (!id || !claimed) return null
  const { data } = await admin.rpc('stripe_org_for_customer', { p_customer: id })
  return data === claimed ? claimed : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  if (!stripe || !signingSecret) return json({ error: 'Not configured.' }, 503)

  const signature = req.headers.get('Stripe-Signature')
  if (!signature) return json({ error: 'Missing signature.' }, 400)
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      signingSecret,
      undefined,
      cryptoProvider,
    )
  } catch {
    return json({ error: 'Invalid signature.' }, 400)
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object
      const org = await orgFor(pi.customer, pi.metadata?.org_id)
      if (org && pi.metadata?.kind === 'balance') {
        const { error } = await admin.rpc('stripe_apply_payment', {
          p_org: org,
          p_amount: pi.amount,
          p_card_ref: String(pi.metadata.card_ref ?? ''),
          p_intent: pi.id,
        })
        if (error) throw new Error(error.message)
      }
    } else if (event.type === 'setup_intent.succeeded') {
      const si = event.data.object
      const org = await orgFor(si.customer, si.metadata?.org_id)
      const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id
      if (org && pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId)
        const brand = cardBrand(pm.card?.brand)
        if (pm.card && brand) {
          const { error } = await admin.rpc('stripe_record_card', {
            p_org: org,
            p_ref: pm.id,
            p_brand: brand,
            p_last4: pm.card.last4,
            p_exp_month: pm.card.exp_month,
            p_exp_year: pm.card.exp_year,
          })
          if (error) throw new Error(error.message)
        }
      }
    }
    // Other events aren't used.
    return json({ received: true })
  } catch (e) {
    console.error('stripe-webhook failed', event.type, e instanceof Error ? e.message : e)
    // A 500 makes Stripe retry later.
    return json({ error: 'Failed.' }, 500)
  }
})
