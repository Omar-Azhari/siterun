// Supabase implementation of the Api. Reads go through RLS-protected tables and
// security_invoker views; anything with business rules calls a SECURITY DEFINER
// function (see supabase/migrations). Payments stay mocked: only card brand,
// last four digits and expiry are ever sent.
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js'
import { format, subDays } from 'date-fns'
import { geocodeLocal } from '@/lib/geo'
import type { SwapOptionId } from '@/lib/booking'
import {
  ApiError,
  type Api,
  type BookingInput,
  type BusinessProfileInput,
  type CardInput,
  type DocumentUploadInput,
  type MachineDraft,
  type SignUpInput,
  type SiteInput,
  type TimeRange,
} from '../api'
import type {
  AdminStats,
  BookingView,
  CollectionRequest,
  Machine,
  MemberRole,
  Organisation,
  PayoutSummary,
  PerformanceSummary,
  Profile,
  SearchFilters,
  Site,
} from '../types'
import * as map from './mappers'

const REMEMBER_KEY = 'siterun-remember'
const ACTIVE = ['in_transit', 'on_site', 'return_scheduled']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function storageOf(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/** "Remember me" off keeps the session in sessionStorage, so it ends with the tab. */
const rememberStorage = {
  getItem: (key: string) =>
    storageOf('local')?.getItem(key) ?? storageOf('session')?.getItem(key) ?? null,
  setItem: (key: string, value: string) => {
    const remember = storageOf('local')?.getItem(REMEMBER_KEY) !== 'false'
    storageOf(remember ? 'session' : 'local')?.removeItem(key)
    storageOf(remember ? 'local' : 'session')?.setItem(key, value)
  },
  removeItem: (key: string) => {
    storageOf('local')?.removeItem(key)
    storageOf('session')?.removeItem(key)
  },
}

const CODES: Record<string, ApiError['code']> = {
  '28000': 'unauthenticated',
  '42501': 'forbidden',
  P0002: 'not_found',
  PGRST116: 'not_found',
  '22023': 'invalid',
  '22P02': 'invalid',
  '23514': 'invalid',
  '23505': 'conflict',
  '23P01': 'conflict',
}

function toApiError(e: PostgrestError | { message: string; code?: string } | Error): ApiError {
  const code = 'code' in e && e.code ? (CODES[e.code] ?? 'unknown') : 'unknown'
  if (code === 'forbidden' && /row-level security/i.test(e.message)) {
    return new ApiError('You don’t have permission to do that.', 'forbidden')
  }
  return new ApiError(e.message, code)
}

/**
 * Unwraps a Supabase response, throwing an ApiError on failure. Data is only null for
 * maybeSingle() misses, which callers check for.
 */
function must<T>(res: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (res.error) throw toApiError(res.error)
  return res.data as NonNullable<T>
}

const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_').slice(-80)
const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

export class SupabaseApi implements Api {
  readonly mode = 'supabase' as const
  readonly client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: {
        storage: rememberStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }

  // ---- helpers -------------------------------------------------------------------
  private async uid(): Promise<string> {
    const { data } = await this.client.auth.getSession()
    const id = data.session?.user.id
    if (!id) throw new ApiError('Please log in to continue.', 'unauthenticated')
    return id
  }

  private async profile() {
    const id = await this.uid()
    const row = must(await this.client.from('profiles').select('*').eq('id', id).single())
    return map.toProfile(row)
  }

  private async orgId(): Promise<string> {
    const p = await this.profile()
    if (!p.orgId) throw new ApiError('Complete your business profile first.', 'forbidden')
    return p.orgId
  }

  private async role(profileId: string): Promise<MemberRole | null> {
    const rows = must(
      await this.client.from('org_members').select('role').eq('profile_id', profileId).limit(1),
    )
    return rows[0]?.role ?? null
  }

  private async rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const res = await this.client.rpc(fn, args)
    if (res.error) throw toApiError(res.error)
    return res.data as T
  }

  private async bookingView(id: string): Promise<BookingView> {
    const row = must(await this.client.from('booking_details').select('*').eq('id', id).single())
    return map.toBookingView(row)
  }

  private async machine(id: string): Promise<Machine> {
    const row = must(await this.client.from('machine_details').select('*').eq('id', id).single())
    return map.toMachine(row)
  }

  // ---- auth ----------------------------------------------------------------------
  async getSessionProfileId() {
    const { data } = await this.client.auth.getSession()
    return data.session?.user.id ?? null
  }

  onAuthChange(cb: (profileId: string | null) => void) {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      // Defer so callers can safely query Supabase from inside the callback.
      setTimeout(() => cb(session?.user.id ?? null), 0)
    })
    return () => data.subscription.unsubscribe()
  }

  async signIn(email: string, password: string, remember: boolean) {
    storageOf('local')?.setItem(REMEMBER_KEY, String(remember))
    const { error } = await this.client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      if (/confirm/i.test(error.message))
        throw new ApiError('Please verify your email first.', 'forbidden')
      throw new ApiError('Incorrect email or password.', 'invalid')
    }
    await this.rpc('accept_invitations').catch(() => 0)
  }

  async signInWithProvider(provider: 'google' | 'apple') {
    storageOf('local')?.setItem(REMEMBER_KEY, 'true')
    const { error } = await this.client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/login` },
    })
    if (error) throw new ApiError(error.message, 'invalid')
  }

  async signUp(input: SignUpInput) {
    const { data, error } = await this.client.auth.signUp({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      options: {
        // The trigger reads these; platform admin is never taken from sign-up data.
        data: {
          full_name: input.fullName.trim(),
          phone: input.phone,
          account_type: input.accountType,
        },
        emailRedirectTo: `${window.location.origin}/verify?email=${encodeURIComponent(input.email.trim().toLowerCase())}`,
      },
    })
    if (error)
      throw new ApiError(
        error.message,
        /registered|exists/i.test(error.message) ? 'conflict' : 'invalid',
      )
    // Supabase hides existing accounts by returning a user with no identities.
    if (data.user && data.user.identities?.length === 0)
      throw new ApiError('An account with this email already exists.', 'conflict')
  }

  async verifyOtp(email: string, code: string) {
    const target = email.trim().toLowerCase()
    let { error } = await this.client.auth.verifyOtp({ email: target, token: code, type: 'signup' })
    if (error)
      ({ error } = await this.client.auth.verifyOtp({ email: target, token: code, type: 'email' }))
    if (error) throw new ApiError('That code is incorrect or has expired. Try again.', 'invalid')
    await this.rpc('accept_invitations').catch(() => 0)
  }

  async resendOtp(email: string) {
    const { error } = await this.client.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })
    if (error) throw new ApiError(error.message, 'invalid')
  }

  async requestPasswordReset(email: string) {
    // Result ignored on purpose so accounts can't be enumerated.
    await this.client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  }

  async updatePassword(password: string) {
    const { error } = await this.client.auth.updateUser({ password })
    if (error) throw new ApiError(error.message, 'invalid')
  }

  async signOut() {
    await this.client.removeAllChannels()
    await this.client.auth.signOut()
  }

  // ---- me --------------------------------------------------------------------------
  async getMe() {
    const { data } = await this.client.auth.getSession()
    const user = data.session?.user
    if (!user) return null
    const row = must(await this.client.from('profiles').select('*').eq('id', user.id).maybeSingle())
    if (!row) return null
    const profile = map.toProfile(row, !!user.email_confirmed_at)
    const org = profile.orgId
      ? map.toOrg(
          must(
            await this.client.from('organisations').select('*').eq('id', profile.orgId).single(),
          ),
        )
      : null
    return { profile, org, role: await this.role(profile.id) }
  }

  async completeBusinessProfile(input: BusinessProfileInput) {
    const row = await this.rpc('complete_business_profile', {
      p_company_name: input.companyName,
      p_abn: input.abn,
      p_contact_name: input.contactName,
      p_email: input.email,
      p_phone: input.phone,
      p_address: input.address,
    })
    return map.toOrg(row as Record<string, unknown>)
  }

  async updateProfile(patch: Partial<Pick<Profile, 'fullName' | 'phone'>>) {
    const id = await this.uid()
    const row = must(
      await this.client
        .from('profiles')
        .update({
          ...(patch.fullName !== undefined && { full_name: patch.fullName.trim() }),
          ...(patch.phone !== undefined && { phone: patch.phone }),
        })
        .eq('id', id)
        .select('*')
        .single(),
    )
    return map.toProfile(row)
  }

  async updateOrganisation(patch: Partial<Omit<Organisation, 'id' | 'kind'>>) {
    const p = await this.profile()
    if (!p.orgId) throw new ApiError('Complete your business profile first.', 'forbidden')
    if ((await this.role(p.id)) !== 'owner')
      throw new ApiError('Only the organisation owner can change company details.', 'forbidden')
    const row = must(
      await this.client
        .from('organisations')
        .update(map.orgPatch(patch))
        .eq('id', p.orgId)
        .select('*')
        .single(),
    )
    return map.toOrg(row)
  }

  // ---- sites & team ----------------------------------------------------------------
  async listSites() {
    const org = await this.orgId()
    const [sites, bookings] = await Promise.all([
      this.client.from('sites').select('*').eq('org_id', org).order('created_at'),
      this.client
        .from('bookings')
        .select('site_id')
        .eq('contractor_org_id', org)
        .in('status', ACTIVE),
    ])
    const counts = new Map<string, number>()
    for (const b of must(bookings))
      if (b.site_id) counts.set(b.site_id, (counts.get(b.site_id) ?? 0) + 1)
    return must(sites).map((r) => ({ ...map.toSite(r), activeHires: counts.get(r.id) ?? 0 }))
  }

  async getSite(id: string) {
    const org = await this.orgId()
    const row = must(
      await this.client.from('sites').select('*').eq('id', id).eq('org_id', org).maybeSingle(),
    )
    return row ? map.toSite(row) : null
  }

  async createSite(input: SiteInput) {
    const p = await this.profile()
    if (!p.orgId) throw new ApiError('Complete your business profile first.', 'forbidden')
    const role = await this.role(p.id)
    if (role === 'viewer' || role === 'site_manager')
      throw new ApiError('Only owners and project managers can create sites.', 'forbidden')
    const { count } = await this.client
      .from('org_members')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', p.orgId)
    const row = must(
      await this.client
        .from('sites')
        .insert({ ...map.sitePatch(input), org_id: p.orgId, team_count: count ?? 1 })
        .select('*')
        .single(),
    )
    return map.toSite(row)
  }

  async updateSite(id: string, patch: Partial<SiteInput>) {
    const org = await this.orgId()
    const rows = must(
      await this.client
        .from('sites')
        .update(map.sitePatch(patch as Partial<Site>))
        .eq('id', id)
        .eq('org_id', org)
        .select('*'),
    )
    if (!rows.length) throw new ApiError('You can’t edit this site.', 'forbidden')
    return map.toSite(rows[0])
  }

  async listMembers() {
    const org = await this.orgId()
    return must(
      await this.client.from('org_members').select('*').eq('org_id', org).order('created_at'),
    ).map(map.toMember)
  }

  async listInvitations() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('invitations')
        .select('*')
        .eq('org_id', org)
        .eq('status', 'pending')
        .order('created_at'),
    ).map(map.toInvitation)
  }

  async inviteMembers(invites: { email: string; role: MemberRole }[]) {
    const rows = await this.rpc<Record<string, unknown>[]>('invite_members', { invites })
    return rows.map(map.toInvitation)
  }

  async updateMemberRole(memberId: string, role: MemberRole) {
    await this.rpc('update_member_role', { member: memberId, new_role: role })
  }

  // ---- plans -------------------------------------------------------------------------
  async getSubscription() {
    const org = await this.orgId()
    const row = must(
      await this.client.from('subscriptions').select('*').eq('org_id', org).maybeSingle(),
    )
    return row ? map.toSubscription(row) : null
  }

  async subscribe(
    plan: 'starter' | 'pro' | 'enterprise',
    period: 'monthly' | 'annual',
    creditsPack: number | null,
  ) {
    const row = await this.rpc('subscribe_plan', {
      p_plan: plan,
      p_period: period,
      p_credits_pack: creditsPack,
    })
    return map.toSubscription(row as Record<string, unknown>)
  }

  // ---- catalogue ----------------------------------------------------------------------
  async listCategories() {
    return must(await this.client.from('machine_categories').select('*').order('sort_order')).map(
      map.toCategory,
    )
  }

  async searchMachines(f: SearchFilters) {
    const point =
      f.lat !== undefined && f.lng !== undefined
        ? { lat: f.lat, lng: f.lng }
        : f.location
          ? geocodeLocal(f.location)
          : null
    const page = Math.max(1, f.page ?? 1)
    const pageSize = f.pageSize ?? 10
    const res = await this.rpc<{ total: number; ids: string[] }>('search_machines', {
      p_q: f.q?.trim() || null,
      p_category_slug: f.categorySlug ?? null,
      p_lat: point?.lat ?? null,
      p_lng: point?.lng ?? null,
      p_start_date: f.startDate ?? null,
      p_end_date: f.endDate ?? null,
      p_min_tonnes: f.minTonnes ?? null,
      p_max_tonnes: f.maxTonnes ?? null,
      p_min_price: f.minPrice ?? null,
      p_max_price: f.maxPrice ?? null,
      p_hire: f.hireType ?? null,
      p_sort: f.sort ?? 'relevance',
      p_page: page,
      p_page_size: pageSize,
    })
    const rows = res.ids.length
      ? must(await this.client.from('machine_details').select('*').in('id', res.ids))
      : []
    const byId = new Map(rows.map((r) => [r.id as string, map.toMachine(r)]))
    return {
      items: res.ids.map((id) => byId.get(id)).filter((m): m is Machine => !!m),
      total: res.total,
      page,
      pageSize,
    }
  }

  async getMachine(id: string) {
    const row = must(
      await this.client.from('machine_details').select('*').eq('id', id).maybeSingle(),
    )
    return row ? map.toMachine(row) : null
  }

  // ---- contractor bookings ------------------------------------------------------------
  async createBooking(input: BookingInput) {
    const row = await this.rpc<{ id: string }>('create_booking', {
      p_machine: input.machineId,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_quantity: input.quantity,
      p_hire: input.hireType,
      p_delivery: input.delivery,
      p_insurance: input.insurance,
      p_site: input.siteId,
      p_message: input.message ?? '',
    })
    return this.bookingView(row.id)
  }

  async getBooking(id: string) {
    const row = must(
      await this.client
        .from('booking_details')
        .select('*')
        .eq(UUID.test(id) ? 'id' : 'ref', id)
        .maybeSingle(),
    )
    return row ? map.toBookingView(row) : null
  }

  async listMyBookings() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('booking_details')
        .select('*')
        .eq('contractor_org_id', org)
        .order('start_date'),
    ).map(map.toBookingView)
  }

  async listActiveHires() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('booking_details')
        .select('*')
        .eq('contractor_org_id', org)
        .in('status', ACTIVE)
        .order('created_at'),
    ).map(map.toBookingView)
  }

  async extendHire(id: string, newEndDate: string) {
    await this.rpc('extend_hire', { booking: id, new_end: newEndDate })
    return this.bookingView(id)
  }

  async scheduleReturn(id: string, request: CollectionRequest) {
    await this.rpc('schedule_return', {
      booking: id,
      collect_on: request.date,
      slot: request.slot,
      notes: request.notes,
    })
    return this.bookingView(id)
  }

  async smartSwap(id: string, option: SwapOptionId) {
    await this.rpc('smart_swap', { booking: id, option })
    return this.bookingView(id)
  }

  async cancelBooking(id: string) {
    await this.rpc('cancel_booking', { booking: id })
    return this.bookingView(id)
  }

  async getDelivery(bookingId: string) {
    const row = must(
      await this.client.from('deliveries').select('*').eq('booking_id', bookingId).maybeSingle(),
    )
    return row ? map.toDelivery(row) : null
  }

  subscribeDelivery(bookingId: string, cb: (d: ReturnType<typeof map.toDelivery>) => void) {
    const channel = this.client
      .channel(`delivery:${bookingId}:${newId()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries', filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          if (payload.new && 'booking_id' in payload.new) cb(map.toDelivery(payload.new))
        },
      )
      .subscribe()
    return () => void this.client.removeChannel(channel)
  }

  // ---- messaging ----------------------------------------------------------------------
  async listConversations() {
    await this.orgId()
    return must(
      await this.client
        .from('conversation_list')
        .select('*')
        .order('last_message_at', { ascending: false }),
    ).map(map.toConversation)
  }

  async getConversation(id: string) {
    const row = must(
      await this.client.from('conversation_list').select('*').eq('id', id).maybeSingle(),
    )
    return row ? map.toConversation(row) : null
  }

  async listMessages(conversationId: string) {
    return must(
      await this.client
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at'),
    ).map(map.toMessage)
  }

  async sendMessage(conversationId: string, body: string, attachment?: File | null) {
    const p = await this.profile()
    const text = body.trim()
    if (!text && !attachment) throw new ApiError('Type a message first.', 'invalid')
    if (text.length > 2000)
      throw new ApiError('Messages are limited to 2,000 characters.', 'invalid')
    let attachmentPath: string | null = null
    if (attachment) {
      if (attachment.size > 10 * 1024 * 1024)
        throw new ApiError('Files must be 10MB or smaller.', 'invalid')
      attachmentPath = `${conversationId}/${newId()}-${safeName(attachment.name)}`
      const up = await this.client.storage
        .from('message-attachments')
        .upload(attachmentPath, attachment)
      if (up.error) throw new ApiError(up.error.message, 'invalid')
    }
    const row = must(
      await this.client
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: p.id,
          sender_org_id: p.orgId,
          sender_name: p.fullName,
          body: text,
          attachment_name: attachment?.name ?? null,
          attachment_path: attachmentPath,
        })
        .select('*')
        .single(),
    )
    return map.toMessage(row)
  }

  async markConversationRead(conversationId: string) {
    await this.rpc('mark_conversation_read', { conv: conversationId })
  }

  subscribeMessages(conversationId: string, cb: (m: ReturnType<typeof map.toMessage>) => void) {
    const channel = this.client
      .channel(`messages:${conversationId}:${newId()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => cb(map.toMessage(payload.new)),
      )
      .subscribe()
    return () => void this.client.removeChannel(channel)
  }

  async openConversationForBooking(bookingId: string) {
    return this.rpc<string>('open_conversation', { booking: bookingId })
  }

  // ---- payments (mock provider) ---------------------------------------------------------
  async getAccountBalance() {
    return this.rpc<number>('account_balance')
  }

  async listPaymentMethods() {
    const org = await this.orgId()
    return must(
      await this.client.from('payment_methods').select('*').eq('org_id', org).order('created_at'),
    ).map(map.toPaymentMethod)
  }

  async addPaymentMethod(card: CardInput) {
    const org = await this.orgId()
    if (!/^\d{4}$/.test(card.last4)) throw new ApiError('Invalid card.', 'invalid')
    if (new Date(card.expYear, card.expMonth, 0) < new Date())
      throw new ApiError('This card has expired.', 'invalid')
    const { count } = await this.client
      .from('payment_methods')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org)
    const row = must(
      await this.client
        .from('payment_methods')
        .insert({
          org_id: org,
          brand: card.brand,
          last4: card.last4,
          exp_month: card.expMonth,
          exp_year: card.expYear,
          is_default: !count,
        })
        .select('*')
        .single(),
    )
    return map.toPaymentMethod(row)
  }

  async removePaymentMethod(id: string) {
    must(await this.client.from('payment_methods').delete().eq('id', id))
  }

  async makePayment(amountCents: number, methodId: string) {
    await this.rpc('make_payment', { p_amount: amountCents, p_method: methodId })
  }

  async listInvoices() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('invoices')
        .select('*')
        .eq('org_id', org)
        .order('issued_at', { ascending: false }),
    ).map(map.toInvoice)
  }

  async getInvoice(id: string) {
    const row = must(await this.client.from('invoices').select('*').eq('id', id).maybeSingle())
    return row ? map.toInvoice(row) : null
  }

  // ---- notifications ---------------------------------------------------------------------
  async listNotifications() {
    const id = await this.uid()
    return must(
      await this.client
        .from('notifications')
        .select('*')
        .eq('profile_id', id)
        .order('created_at', { ascending: false })
        .limit(100),
    ).map(map.toNotification)
  }

  async markNotificationRead(id: string) {
    must(await this.client.from('notifications').update({ read: true }).eq('id', id))
  }

  async markAllNotificationsRead() {
    await this.rpc('mark_all_notifications_read')
  }

  subscribeNotifications(cb: () => void) {
    let channel: ReturnType<SupabaseClient['channel']> | null = null
    let closed = false
    void this.getSessionProfileId().then((id) => {
      if (!id || closed) return
      channel = this.client
        .channel(`notifications:${id}:${newId()}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${id}` },
          () => cb(),
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () =>
          cb(),
        )
        .subscribe()
    })
    return () => {
      closed = true
      if (channel) void this.client.removeChannel(channel)
    }
  }

  // ---- supplier listings ---------------------------------------------------------------------
  async listMyMachines() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('machine_details')
        .select('*')
        .eq('supplier_org_id', org)
        .order('created_at'),
    ).map(map.toMachine)
  }

  async createMachineDraft(categoryId: string) {
    const org = await this.orgId()
    const cat = must(
      await this.client
        .from('machine_categories')
        .select('name')
        .eq('id', categoryId)
        .maybeSingle(),
    )
    if (!cat) throw new ApiError('Choose a category.', 'invalid')
    const row = must(
      await this.client
        .from('machines')
        .insert({
          supplier_org_id: org,
          category_id: categoryId,
          title: String(cat.name).replace(/s$/, ''),
        })
        .select('id')
        .single(),
    )
    return this.machine(row.id)
  }

  async saveMachineDraft(id: string, patch: MachineDraft) {
    const current = must(
      await this.client.from('machines').select('status, draft_step').eq('id', id).single(),
    )
    if (current.status === 'pending_review')
      throw new ApiError('This listing is being reviewed and can’t be edited right now.', 'invalid')
    const update = {
      ...map.machinePatch(patch),
      draft_step: Math.max(current.draft_step, patch.draftStep ?? 0),
      ...(current.status === 'rejected' && { status: 'draft' }),
    }
    must(await this.client.from('machines').update(update).eq('id', id))
    if (patch.photos) {
      must(await this.client.from('machine_photos').delete().eq('machine_id', id))
      if (patch.photos.length)
        must(
          await this.client
            .from('machine_photos')
            .insert(patch.photos.map((url, i) => ({ machine_id: id, url, sort_order: i }))),
        )
    }
    return this.machine(id)
  }

  async uploadMachinePhoto(id: string, file: File) {
    const org = await this.orgId()
    if (!file.type.startsWith('image/')) throw new ApiError('Photos must be images.', 'invalid')
    const path = `${org}/${id}/${newId()}-${safeName(file.name)}`
    const up = await this.client.storage
      .from('machine-photos')
      .upload(path, file, { contentType: file.type })
    if (up.error) throw new ApiError(up.error.message, 'invalid')
    return this.client.storage.from('machine-photos').getPublicUrl(path).data.publicUrl
  }

  async submitMachine(id: string) {
    await this.rpc('submit_machine', { machine: id })
    return this.machine(id)
  }

  async setMachinePaused(id: string, paused: boolean) {
    await this.rpc('set_machine_paused', { machine: id, paused })
    return this.machine(id)
  }

  // ---- compliance ---------------------------------------------------------------------------
  async listRequirements() {
    return must(
      await this.client.from('compliance_requirements').select('*').order('sort_order'),
    ).map((r) => ({
      id: r.id,
      group: r.group,
      name: r.name,
      description: r.description,
      icon: r.icon,
      required: r.required,
      sortOrder: r.sort_order,
    }))
  }

  async listDocuments(filter: { machineId?: string; profileId?: string }) {
    let q = this.client.from('compliance_documents').select('*')
    if (filter.machineId) q = q.eq('machine_id', filter.machineId)
    if (filter.profileId) q = q.eq('profile_id', filter.profileId)
    return must(await q.order('uploaded_at', { ascending: false })).map(map.toDocument)
  }

  async listOrgDocuments() {
    const org = await this.orgId()
    return must(await this.client.from('compliance_documents').select('*').eq('org_id', org)).map(
      map.toDocument,
    )
  }

  async uploadDocument(input: DocumentUploadInput) {
    const org = await this.orgId()
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(input.file.type))
      throw new ApiError('Upload a PDF, JPG or PNG file.', 'invalid')
    if (input.file.size > 10 * 1024 * 1024)
      throw new ApiError('Files must be 10MB or smaller.', 'invalid')
    const path = `${org}/${newId()}-${safeName(input.file.name)}`
    const up = await this.client.storage
      .from('compliance-docs')
      .upload(path, input.file, { contentType: input.file.type })
    if (up.error) throw new ApiError(up.error.message, 'invalid')
    const row = must(
      await this.client
        .from('compliance_documents')
        .insert({
          org_id: org,
          machine_id: input.machineId,
          profile_id: input.profileId,
          requirement_id: input.requirementId,
          file_name: input.file.name,
          file_size: input.file.size,
          storage_path: path,
          expiry_date: input.expiryDate,
          notes: input.notes,
        })
        .select('*')
        .single(),
    )
    return map.toDocument(row)
  }

  async getDocumentUrl(id: string) {
    const row = must(
      await this.client
        .from('compliance_documents')
        .select('storage_path')
        .eq('id', id)
        .maybeSingle(),
    )
    if (!row) throw new ApiError('Document not found.', 'not_found')
    if (!row.storage_path) return null
    const { data } = await this.client.storage
      .from('compliance-docs')
      .createSignedUrl(row.storage_path, 600)
    return data?.signedUrl ?? null
  }

  // ---- supplier bookings & money --------------------------------------------------------------
  async listSupplierBookings() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('booking_details')
        .select('*')
        .eq('supplier_org_id', org)
        .order('start_date'),
    ).map(map.toBookingView)
  }

  async respondToBooking(id: string, accept: boolean, reason?: string) {
    await this.rpc('respond_to_booking', { booking: id, accept, reason: reason ?? null })
    return this.bookingView(id)
  }

  async advanceBooking(id: string, to: 'in_transit' | 'on_site' | 'completed') {
    await this.rpc('advance_booking', { booking: id, to_status: to })
    return this.bookingView(id)
  }

  async getPayoutSummary() {
    return this.rpc<PayoutSummary>('payout_summary')
  }

  async listPayouts() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('payouts')
        .select('*')
        .eq('org_id', org)
        .order('requested_at', { ascending: false }),
    ).map(map.toPayout)
  }

  async requestPayout() {
    return map.toPayout(await this.rpc('request_payout'))
  }

  async getPerformance(range: '30d' | '90d' | '1y') {
    return this.rpc<PerformanceSummary>('supplier_performance', { range_key: range })
  }

  // ---- operator -------------------------------------------------------------------------------
  async listOperatorBookings() {
    const id = await this.uid()
    return must(
      await this.client
        .from('booking_details')
        .select('*')
        .eq('operator_profile_id', id)
        .not('status', 'in', '(declined,cancelled)')
        .order('start_date'),
    ).map(map.toBookingView)
  }

  // ---- support --------------------------------------------------------------------------------
  async listTickets() {
    const org = await this.orgId()
    return must(
      await this.client
        .from('support_tickets')
        .select('*')
        .eq('org_id', org)
        .order('created_at', { ascending: false }),
    ).map(map.toTicket)
  }

  async createTicket(input: { subject: string; category: string; description: string }) {
    const p = await this.profile()
    if (input.subject.trim().length < 3) throw new ApiError('Add a short subject.', 'invalid')
    const row = must(
      await this.client
        .from('support_tickets')
        .insert({
          org_id: p.orgId,
          created_by: p.id,
          subject: input.subject.trim(),
          category: input.category,
          description: input.description.trim(),
        })
        .select('*')
        .single(),
    )
    return map.toTicket(row)
  }

  // ---- platform admin ---------------------------------------------------------------------------
  async getAdminStats(range: TimeRange) {
    return this.rpc<AdminStats>('admin_stats', { range_key: range })
  }

  private async requireAdmin() {
    const p = await this.profile()
    if (!p.isPlatformAdmin) throw new ApiError('Platform admin access only.', 'forbidden')
  }

  async listAdminActivity() {
    await this.requireAdmin()
    return must(
      await this.client
        .from('admin_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
    ).map(map.toActivity)
  }

  async listPendingMachines() {
    await this.requireAdmin()
    return must(
      await this.client
        .from('machine_details')
        .select('*')
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: false }),
    ).map(map.toMachine)
  }

  async listPendingDocuments() {
    await this.requireAdmin()
    const rows = must(
      await this.client
        .from('compliance_documents')
        .select(
          '*, organisations(name), machines(title), owner:profiles!compliance_documents_profile_id_fkey(full_name)',
        )
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false }),
    )
    const paths = rows.map((r) => r.storage_path).filter(Boolean) as string[]
    const signed = paths.length
      ? ((await this.client.storage.from('compliance-docs').createSignedUrls(paths, 600)).data ??
        [])
      : []
    const urlFor = new Map(signed.map((s) => [s.path, s.signedUrl]))
    return rows.map((r) => ({
      ...map.toDocument(r),
      fileUrl: r.storage_path ? (urlFor.get(r.storage_path) ?? null) : null,
      orgName: r.organisations?.name ?? '',
      machineTitle: r.machines?.title ?? r.owner?.full_name ?? null,
    }))
  }

  async reviewMachine(id: string, approve: boolean, reason?: string) {
    await this.rpc('review_machine', { machine: id, approve, reason: reason ?? null })
    return this.machine(id)
  }

  async reviewDocument(id: string, approve: boolean, reason?: string) {
    return map.toDocument(
      await this.rpc('review_document', { doc: id, approve, reason: reason ?? null }),
    )
  }

  async listSupplierOrgs() {
    await this.requireAdmin()
    const [orgs, machines] = await Promise.all([
      this.client.from('organisations').select('*').eq('kind', 'supplier').order('name'),
      this.client.from('machines').select('supplier_org_id, status'),
    ])
    const list = must(machines)
    return must(orgs).map((o) => ({
      ...map.toOrg(o),
      machineCount: list.filter((m) => m.supplier_org_id === o.id).length,
      liveCount: list.filter((m) => m.supplier_org_id === o.id && m.status === 'live').length,
    }))
  }

  async listAllBookings() {
    await this.requireAdmin()
    const since = format(subDays(new Date(), 14), 'yyyy-MM-dd')
    return must(
      await this.client
        .from('booking_details')
        .select('*')
        .or(`status.neq.completed,end_date.gte.${since}`)
        .order('created_at', { ascending: false }),
    ).map(map.toBookingView)
  }
}
