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
    const res = await alex
      .from('payment_methods')
      .insert({
        org_id: ACME,
        brand: 'visa',
        last4: '4242424242424242',
        exp_month: 1,
        exp_year: 2030,
      })
    expect(res.error).not.toBeNull()
  })
})
