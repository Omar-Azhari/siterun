// Row Level Security checks against the Supabase project in .env, signed in as the
// seeded demo accounts. Run with `npm run test:rls` (needs `supabase/seed.sql` loaded).
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const env = loadEnv('development', process.cwd(), 'VITE_')
const URL = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
const PASSWORD = 'SiteRun!2026'

const ACME = 'de5ce6ae-5e55-427b-a9e7-17ae78e940d3'
const BUILDCO = '68873213-89b7-45bb-a57e-8b22a935be83'
const TURNER_DRAFT = 'f04a1526-528f-4b00-af74-34a154972db5'

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(URL, KEY, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`${email}: ${error.message}`)
  return client
}

describe.runIf(URL && KEY)('row level security', () => {
  let alex: SupabaseClient
  let jordan: SupabaseClient
  let admin: SupabaseClient
  const anon = createClient(URL ?? 'http://x', KEY ?? 'x', { auth: { persistSession: false } })

  beforeAll(async () => {
    ;[alex, jordan, admin] = await Promise.all([
      signIn('alex@acme.test'),
      signIn('jordan@turnerplant.test'),
      signIn('admin@siterun.test'),
    ])
  })

  afterAll(async () => {
    await Promise.all([alex, jordan, admin].map((c) => c?.auth.signOut()))
  })

  it('a contractor cannot read another organisation’s bookings', async () => {
    const other = await alex.from('bookings').select('id').eq('contractor_org_id', BUILDCO)
    expect(other.error).toBeNull()
    expect(other.data).toEqual([])
    const own = await alex.from('bookings').select('id').eq('contractor_org_id', ACME)
    expect(own.data?.length).toBeGreaterThan(0)
  })

  it('a contractor cannot read another organisation’s sites or invoices', async () => {
    const sites = await alex.from('sites').select('id').eq('org_id', BUILDCO)
    expect(sites.data).toEqual([])
    const invoices = await alex.from('invoices').select('id').neq('org_id', ACME)
    expect(invoices.data).toEqual([])
  })

  it('a supplier cannot approve their own machine', async () => {
    const rpc = await jordan.rpc('review_machine', {
      machine: TURNER_DRAFT,
      approve: true,
      reason: null,
    })
    expect(rpc.error?.message).toMatch(/platform admin/i)
    const direct = await jordan.from('machines').update({ status: 'live' }).eq('id', TURNER_DRAFT)
    expect(direct.error?.message).toMatch(/submission and review/i)
    const check = await jordan.from('machines').select('status').eq('id', TURNER_DRAFT).single()
    expect(check.data?.status).toBe('draft')
  })

  it('a supplier cannot verify their own documents', async () => {
    const docs = await jordan
      .from('compliance_documents')
      .select('id')
      .eq('status', 'pending')
      .limit(1)
    const id = docs.data?.[0]?.id
    expect(id).toBeTruthy()
    const res = await jordan
      .from('compliance_documents')
      .update({ status: 'verified' })
      .eq('id', id)
    expect(res.error).not.toBeNull()
  })

  it('nobody can make themselves a platform admin', async () => {
    const { data } = await alex.auth.getUser()
    const res = await alex
      .from('profiles')
      .update({ is_platform_admin: true })
      .eq('id', data.user?.id ?? '')
    expect(res.error?.message).toMatch(/only change your name/i)
  })

  it('a non-admin cannot use admin functions or read the admin feed', async () => {
    const stats = await alex.rpc('admin_stats', { range_key: '30d' })
    expect(stats.error?.message).toMatch(/platform admin/i)
    const feed = await jordan.from('admin_actions').select('id')
    expect(feed.data).toEqual([])
  })

  it('the platform admin can read admin stats', async () => {
    const stats = await admin.rpc('admin_stats', { range_key: '30d' })
    expect(stats.error).toBeNull()
    expect(stats.data.users).toBeGreaterThan(0)
  })

  it('anonymous visitors only see live listings and cannot call business functions', async () => {
    const machines = await anon.from('machines').select('status')
    expect(machines.data?.every((m) => m.status === 'live')).toBe(true)
    const booking = await anon.rpc('cancel_booking', { booking: ACME })
    expect(booking.error).not.toBeNull()
    const bookings = await anon.from('bookings').select('id')
    expect(bookings.data ?? []).toEqual([])
  })

  it('card numbers cannot be stored: only the last four digits fit', async () => {
    const res = await alex.from('payment_methods').insert({
      org_id: ACME,
      brand: 'visa',
      last4: '4242424242424242',
      exp_month: 1,
      exp_year: 2030,
    })
    expect(res.error).not.toBeNull()
  })

  // ---- launch features (live location, error reports, push, Stripe) ----------------
  const CONFIRMED_TURNER_BOOKING = 'ac255368-608d-4d75-a8f5-8ae32c5e41a1'

  it('only the supplier or its operator can share a delivery’s location, and only in transit', async () => {
    const contractor = await alex.rpc('report_location', {
      p_booking: CONFIRMED_TURNER_BOOKING,
      p_lat: -37.8,
      p_lng: 144.9,
    })
    expect(contractor.error?.message).toMatch(/not found/i)
    const notYet = await jordan.rpc('report_location', {
      p_booking: CONFIRMED_TURNER_BOOKING,
      p_lat: -37.8,
      p_lng: 144.9,
    })
    expect(notYet.error?.message).toMatch(/on its way/i)
    const signedOut = await anon.rpc('report_location', {
      p_booking: CONFIRMED_TURNER_BOOKING,
      p_lat: -37.8,
      p_lng: 144.9,
    })
    expect(signedOut.error).not.toBeNull()
  })

  it('error reports can be sent by anyone but read only by platform admins', async () => {
    const sent = await anon.rpc('log_client_error', {
      p_message: 'rls test: anonymous report',
      p_stack: '',
      p_url: 'https://example.test/login?token=secret',
      p_release: 'test',
      p_platform: 'web',
      p_user_agent: 'vitest',
    })
    expect(sent.error).toBeNull()
    expect((await alex.from('client_errors').select('id')).data).toEqual([])
    expect((await anon.from('client_errors').select('id')).data ?? []).toEqual([])
    const seen = await admin
      .from('client_errors')
      .select('url')
      .eq('message', 'rls test: anonymous report')
    expect(seen.data?.[0]?.url).toBe('https://example.test/login')
    const tamper = await alex.from('client_errors').insert({ fingerprint: 'x', message: 'x' })
    expect(tamper.error).not.toBeNull()
  })

  it('push and Stripe functions are closed to the app', async () => {
    for (const client of [anon, alex, admin]) {
      expect((await client.rpc('push_hook_secret')).error).not.toBeNull()
      expect(
        (await client.rpc('push_payload', { p_notification: CONFIRMED_TURNER_BOOKING })).error,
      ).not.toBeNull()
      expect(
        (
          await client.rpc('stripe_record_card', {
            p_org: ACME,
            p_ref: 'pm_fake',
            p_brand: 'visa',
            p_last4: '4242',
            p_exp_month: 1,
            p_exp_year: 2030,
          })
        ).error,
      ).not.toBeNull()
      expect(
        (
          await client.rpc('stripe_apply_payment', {
            p_org: ACME,
            p_amount: 100,
            p_card_ref: 'x',
            p_intent: 'pi_x',
          })
        ).error,
      ).not.toBeNull()
    }
  })

  it('payment context describes only the caller’s own organisation', async () => {
    const ctx = await alex.rpc('payment_context')
    expect(ctx.error).toBeNull()
    expect(ctx.data.org_id).toBe(ACME)
    expect((await anon.rpc('payment_context')).error).not.toBeNull()
  })
})
