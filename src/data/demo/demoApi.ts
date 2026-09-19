// In-browser implementation of the Api used when Supabase isn't configured
// (and by /dev/screens and the e2e suite). Data lives in localStorage and the
// permission checks mirror the database RLS policies.
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import {
  BLOCKING_STATUSES,
  bookingRef,
  bookingTotal,
  distanceKm,
  extensionCost,
  gstOf,
  hireDays,
  rangesOverlap,
  SWAP_OPTIONS,
} from '@/lib/booking'
import { geocodeLocal } from '@/lib/geo'
import { ApiError, type Api, type MachineDraft, type TimeRange } from '../api'
import { DEMO_OTP } from '../constants'
import { buildSeed, DB_VERSION, type DemoDb } from '../seed'
import type {
  AppNotification,
  Booking,
  BookingStatus,
  BookingView,
  ComplianceDocument,
  Delivery,
  Machine,
  Message,
  Organisation,
  Profile,
  SearchResult,
  Site,
} from '../types'

const DB_KEY = 'siterun-demo-db'
const SESSION_KEY = 'siterun-demo-session'

const PLAN_PRICES = { starter: 9900, pro: 24900, enterprise: 0 } as const
const CREDIT_PACKS: Record<number, number> = {
  50000: 50000 + 5000,
  100000: 100000 + 12000,
  250000: 250000 + 35000,
}

const uid = (prefix: string) =>
  `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`

const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const nowIso = () => new Date().toISOString()
const todayStr = () => format(new Date(), 'yyyy-MM-dd')

function safeStorage(kind: 'local' | 'session'): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

async function fileToDataUrl(file: File, maxDim = 900): Promise<string> {
  if (!file.type.startsWith('image/')) {
    return await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(r.error)
      r.readAsDataURL(file)
    })
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.72)
}

type Listener = () => void

export class DemoApi implements Api {
  readonly mode = 'demo' as const
  private db: DemoDb
  private events = new EventTarget()
  private timers = new Map<string, number>()

  constructor(seed?: DemoDb) {
    this.db = seed ?? this.load()
  }

  // ---- persistence -----------------------------------------------------------
  private load(): DemoDb {
    const raw = safeStorage('local')?.getItem(DB_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as DemoDb
        // Re-seed each day so relative dates stay current, and on schema changes.
        if (
          parsed.version === DB_VERSION &&
          parsed.seededAt.slice(0, 10) === new Date().toISOString().slice(0, 10)
        ) {
          return parsed
        }
      } catch {
        // fall through to a fresh seed
      }
    }
    const fresh = buildSeed()
    this.persist(fresh)
    return fresh
  }

  private persist(db = this.db) {
    try {
      safeStorage('local')?.setItem(DB_KEY, JSON.stringify(db))
    } catch {
      // Quota exceeded or storage blocked: keep working in memory.
    }
  }

  private commit(topic: string) {
    this.persist()
    this.events.dispatchEvent(new Event(topic))
    this.events.dispatchEvent(new Event('*'))
  }

  /** Test/dev helper: wipe and reseed. */
  reset(): void {
    this.db = buildSeed()
    this.persist()
    this.stopAllTimers()
    this.commit('auth')
  }

  on(topic: string, cb: Listener): () => void {
    this.events.addEventListener(topic, cb)
    return () => this.events.removeEventListener(topic, cb)
  }

  private stopAllTimers() {
    this.timers.forEach((t) => window.clearInterval(t))
    this.timers.clear()
  }

  // ---- session ------------------------------------------------------------------
  private session(): { profileId: string } | null {
    const raw =
      safeStorage('local')?.getItem(SESSION_KEY) ?? safeStorage('session')?.getItem(SESSION_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw) as { profileId: string }
    } catch {
      return null
    }
  }

  private setSession(profileId: string | null, remember = true) {
    safeStorage('local')?.removeItem(SESSION_KEY)
    safeStorage('session')?.removeItem(SESSION_KEY)
    if (profileId) {
      safeStorage(remember ? 'local' : 'session')?.setItem(
        SESSION_KEY,
        JSON.stringify({ profileId }),
      )
    }
    this.events.dispatchEvent(new Event('auth'))
  }

  /** Dev helper used by /dev/screens to jump between roles. */
  async impersonate(email: string): Promise<void> {
    const p = this.db.profiles.find((x) => x.email === email)
    if (!p) throw new ApiError('Unknown demo account', 'not_found')
    this.setSession(p.id)
  }

  private me(): Profile {
    const s = this.session()
    const p = s && this.db.profiles.find((x) => x.id === s.profileId)
    if (!p) throw new ApiError('Please log in to continue.', 'unauthenticated')
    return p
  }

  private myOrg(): Organisation {
    const p = this.me()
    const o = p.orgId && this.db.organisations.find((x) => x.id === p.orgId)
    if (!o) throw new ApiError('Complete your business profile first.', 'forbidden')
    return o
  }

  private myRole() {
    const p = this.me()
    return this.db.members.find((m) => m.profileId === p.id)?.role ?? null
  }

  private requireSupplier() {
    const p = this.me()
    const org = this.myOrg()
    if (org.kind !== 'supplier' || p.accountType === 'operator')
      throw new ApiError('Supplier access only.', 'forbidden')
    return org
  }

  private requireContractorWriter() {
    const org = this.myOrg()
    if (org.kind !== 'contractor')
      throw new ApiError('Only contractor accounts can hire equipment.', 'forbidden')
    if (this.myRole() === 'viewer')
      throw new ApiError('Viewers can’t create or change bookings.', 'forbidden')
    return org
  }

  private requireAdmin() {
    const p = this.me()
    if (!p.isPlatformAdmin) throw new ApiError('Platform admin access only.', 'forbidden')
    return p
  }

  async getSessionProfileId() {
    return this.session()?.profileId ?? null
  }

  onAuthChange(cb: (profileId: string | null) => void) {
    return this.on('auth', () => cb(this.session()?.profileId ?? null))
  }

  async signIn(email: string, password: string, remember: boolean) {
    await wait(300)
    const key = email.trim().toLowerCase()
    const p = this.db.profiles.find((x) => x.email.toLowerCase() === key)
    if (!p || this.db.passwords[p.email] !== password) {
      throw new ApiError('Incorrect email or password.', 'invalid')
    }
    if (!p.emailVerified) throw new ApiError('Please verify your email first.', 'forbidden')
    this.setSession(p.id, remember)
  }

  async signInWithProvider(provider: 'google' | 'apple') {
    await wait(200)
    throw new ApiError(
      `${provider === 'google' ? 'Google' : 'Apple'} sign-in needs Supabase to be configured. Use a demo account for now.`,
      'invalid',
    )
  }

  async signUp(input: {
    fullName: string
    email: string
    phone: string
    password: string
    accountType: Profile['accountType']
  }) {
    await wait(300)
    const email = input.email.trim().toLowerCase()
    if (this.db.profiles.some((p) => p.email.toLowerCase() === email)) {
      throw new ApiError('An account with this email already exists.', 'conflict')
    }
    const profile: Profile = {
      id: uid('p'),
      fullName: input.fullName.trim(),
      email,
      phone: input.phone,
      accountType: input.accountType,
      isPlatformAdmin: false,
      avatarUrl: null,
      orgId: null,
      emailVerified: false,
    }
    this.db.profiles.push(profile)
    this.db.passwords[email] = input.password
    this.commit('profiles')
  }

  async verifyOtp(email: string, code: string) {
    await wait(300)
    const p = this.db.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!p) throw new ApiError('We couldn’t find that account.', 'not_found')
    if (code !== DEMO_OTP) throw new ApiError('That code is incorrect. Try again.', 'invalid')
    p.emailVerified = true
    this.commit('profiles')
    this.setSession(p.id)
  }

  async resendOtp() {
    await wait(200)
  }

  async requestPasswordReset(email: string) {
    await wait(300)
    void email // Always succeed so accounts can't be enumerated.
  }

  async updatePassword(password: string) {
    await wait(200)
    const p = this.me()
    this.db.passwords[p.email] = password
    this.commit('profiles')
  }

  async signOut() {
    this.stopAllTimers()
    this.setSession(null)
  }

  // ---- me -----------------------------------------------------------------------
  async getMe() {
    await wait(40)
    const s = this.session()
    const profile = s && this.db.profiles.find((p) => p.id === s.profileId)
    if (!profile) return null
    const org = this.db.organisations.find((o) => o.id === profile.orgId) ?? null
    return {
      profile: { ...profile },
      org: org ? { ...org } : null,
      role: this.myRoleOrNull(profile.id),
    }
  }

  private myRoleOrNull(profileId: string) {
    return this.db.members.find((m) => m.profileId === profileId)?.role ?? null
  }

  async completeBusinessProfile(input: {
    companyName: string
    abn: string
    contactName: string
    email: string
    phone: string
    address: string
  }) {
    await wait(300)
    const p = this.me()
    if (p.orgId) throw new ApiError('Your business profile is already set up.', 'conflict')
    const org: Organisation = {
      id: uid('org'),
      kind:
        p.accountType === 'supplier' || p.accountType === 'operator' ? 'supplier' : 'contractor',
      name: input.companyName,
      abn: input.abn,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      rating: null,
      reviewCount: 0,
      logoUrl: null,
      createdAt: nowIso(),
    }
    this.db.organisations.push(org)
    p.orgId = org.id
    this.db.members.push({
      id: uid('mem'),
      orgId: org.id,
      profileId: p.id,
      name: p.fullName,
      email: p.email,
      role: 'owner',
    })
    if (org.kind === 'supplier') {
      this.db.activity.unshift({
        id: uid('a'),
        kind: 'supplier_registered',
        title: 'New supplier registration',
        detail: org.name,
        createdAt: nowIso(),
      })
    }
    this.commit('profiles')
    return org
  }

  async updateProfile(patch: Partial<Pick<Profile, 'fullName' | 'phone'>>) {
    await wait()
    const p = this.me()
    Object.assign(p, patch)
    this.db.members.filter((m) => m.profileId === p.id).forEach((m) => (m.name = p.fullName))
    this.commit('profiles')
    return { ...p }
  }

  async updateOrganisation(patch: Partial<Omit<Organisation, 'id' | 'kind'>>) {
    await wait()
    const org = this.myOrg()
    if (this.myRole() !== 'owner')
      throw new ApiError('Only the organisation owner can change company details.', 'forbidden')
    Object.assign(org, patch)
    this.commit('profiles')
    return { ...org }
  }

  // ---- sites & team ------------------------------------------------------------
  async listSites() {
    await wait()
    const org = this.myOrg()
    return this.db.sites
      .filter((s) => s.orgId === org.id)
      .map((s) => ({
        ...s,
        activeHires: this.db.bookings.filter((b) => b.siteId === s.id && isActive(b.status)).length,
      }))
  }

  async getSite(id: string) {
    await wait()
    const org = this.myOrg()
    return this.db.sites.find((s) => s.id === id && s.orgId === org.id) ?? null
  }

  async createSite(input: Omit<Site, 'id' | 'orgId' | 'photoUrl' | 'teamCount'>) {
    await wait(250)
    const org = this.myOrg()
    const role = this.myRole()
    if (role === 'viewer' || role === 'site_manager')
      throw new ApiError('Only owners and project managers can create sites.', 'forbidden')
    const site: Site = {
      ...input,
      id: uid('site'),
      orgId: org.id,
      photoUrl: null,
      teamCount: this.db.members.filter((m) => m.orgId === org.id).length,
    }
    this.db.sites.push(site)
    this.commit('sites')
    return site
  }

  async updateSite(id: string, patch: Partial<Site>) {
    await wait()
    const org = this.myOrg()
    const site = this.db.sites.find((s) => s.id === id && s.orgId === org.id)
    if (!site) throw new ApiError('Site not found.', 'not_found')
    if (this.myRole() === 'viewer') throw new ApiError('Viewers can’t edit sites.', 'forbidden')
    Object.assign(site, patch)
    this.commit('sites')
    return { ...site }
  }

  async listMembers() {
    await wait()
    const org = this.myOrg()
    return this.db.members.filter((m) => m.orgId === org.id)
  }

  async listInvitations() {
    await wait()
    const org = this.myOrg()
    return this.db.invitations.filter((i) => i.orgId === org.id && i.status === 'pending')
  }

  async inviteMembers(invites: { email: string; role: import('../types').MemberRole }[]) {
    await wait(300)
    const org = this.myOrg()
    const role = this.myRole()
    if (role !== 'owner' && role !== 'project_manager')
      throw new ApiError('Only owners and project managers can invite people.', 'forbidden')
    const created = invites.map((i) => {
      const existing = this.db.invitations.find(
        (x) => x.orgId === org.id && x.email === i.email.toLowerCase() && x.status === 'pending',
      )
      if (existing) {
        existing.role = i.role
        return existing
      }
      const inv = {
        id: uid('inv'),
        orgId: org.id,
        email: i.email.toLowerCase(),
        role: i.role,
        status: 'pending' as const,
        createdAt: nowIso(),
      }
      this.db.invitations.push(inv)
      return inv
    })
    this.commit('team')
    return created
  }

  async updateMemberRole(memberId: string, role: import('../types').MemberRole) {
    await wait()
    const org = this.myOrg()
    if (this.myRole() !== 'owner') throw new ApiError('Only owners can change roles.', 'forbidden')
    const m = this.db.members.find((x) => x.id === memberId && x.orgId === org.id)
    if (!m) throw new ApiError('Member not found.', 'not_found')
    m.role = role
    this.commit('team')
  }

  // ---- plans -------------------------------------------------------------------
  async getSubscription() {
    await wait()
    const org = this.myOrg()
    return this.db.subscriptions.find((s) => s.orgId === org.id) ?? null
  }

  async subscribe(
    plan: 'starter' | 'pro' | 'enterprise',
    period: 'monthly' | 'annual',
    creditsPack: number | null,
  ) {
    await wait(400)
    const org = this.myOrg()
    if (this.myRole() !== 'owner')
      throw new ApiError('Only the organisation owner can manage billing.', 'forbidden')
    const method =
      this.db.paymentMethods.find((m) => m.orgId === org.id && m.isDefault) ??
      this.db.paymentMethods.find((m) => m.orgId === org.id)
    let sub = this.db.subscriptions.find((s) => s.orgId === org.id)
    if (!sub) {
      sub = { orgId: org.id, plan, period, status: 'active', creditsBalance: 0, renewsAt: null }
      this.db.subscriptions.push(sub)
    }
    sub.plan = plan
    sub.period = period
    sub.status = 'active'
    sub.renewsAt = format(addDays(new Date(), period === 'annual' ? 365 : 30), 'yyyy-MM-dd')
    const monthly = PLAN_PRICES[plan]
    if (monthly > 0) {
      const amount = period === 'annual' ? Math.round(monthly * 12 * 0.8) : monthly
      this.db.payments.push({
        id: uid('pay'),
        orgId: org.id,
        amountCents: amount + gstOf(amount),
        methodId: method?.id ?? null,
        kind: 'subscription',
        description: `${cap(plan)} plan (${period})`,
        status: 'succeeded',
        createdAt: nowIso(),
      })
    }
    if (creditsPack) {
      const credits = CREDIT_PACKS[creditsPack]
      if (!credits) throw new ApiError('Unknown SiteCredits pack.', 'invalid')
      sub.creditsBalance += credits / 100
      this.db.payments.push({
        id: uid('pay'),
        orgId: org.id,
        amountCents: creditsPack,
        methodId: method?.id ?? null,
        kind: 'credits',
        description: 'SiteCredits pack',
        status: 'succeeded',
        createdAt: nowIso(),
      })
      this.db.creditTransactions.push({
        id: uid('ct'),
        orgId: org.id,
        credits: credits / 100,
        amountCents: creditsPack,
        description: `SiteCredits pack (+${(credits - creditsPack) / 100} bonus)`,
        createdAt: nowIso(),
      })
    }
    this.commit('billing')
    return { ...sub }
  }

  // ---- catalogue ---------------------------------------------------------------
  async listCategories() {
    await wait(60)
    return [...this.db.categories].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async searchMachines(f: import('../types').SearchFilters): Promise<SearchResult> {
    await wait(200)
    const q = f.q?.trim().toLowerCase()
    const cat = f.categorySlug && this.db.categories.find((c) => c.slug === f.categorySlug)
    const point =
      f.lat !== undefined && f.lng !== undefined
        ? { lat: f.lat, lng: f.lng }
        : f.location
          ? geocodeLocal(f.location)
          : null
    let items = this.db.machines.filter((m) => m.status === 'live')
    if (cat) items = items.filter((m) => m.categoryId === cat.id)
    if (q) {
      items = items.filter((m) => {
        const catName = this.db.categories.find((c) => c.id === m.categoryId)?.name ?? ''
        return [m.title, m.make, m.model, catName, m.supplierName]
          .join(' ')
          .toLowerCase()
          .includes(q.replace(/s$/, ''))
      })
    }
    if (f.hireType) items = items.filter((m) => m.hireTypes.includes(f.hireType as 'dry' | 'wet'))
    if (f.minPrice !== undefined)
      items = items.filter((m) => priceFor(m, f.hireType) >= (f.minPrice ?? 0) * 100)
    if (f.maxPrice !== undefined)
      items = items.filter((m) => priceFor(m, f.hireType) <= (f.maxPrice ?? 0) * 100)
    if (f.minTonnes !== undefined)
      items = items.filter(
        (m) => m.capacityTonnes === null || m.capacityTonnes >= (f.minTonnes ?? 0),
      )
    if (f.maxTonnes !== undefined)
      items = items.filter(
        (m) => m.capacityTonnes === null || m.capacityTonnes <= (f.maxTonnes ?? 0),
      )
    if (f.startDate && f.endDate) {
      const s = f.startDate
      const e = f.endDate
      items = items.filter(
        (m) => !this.blockingFor(m.id).some((b) => rangesOverlap(s, e, b.startDate, b.endDate)),
      )
    }
    if (point)
      items = items.filter(
        (m) => distanceKm(point.lat, point.lng, m.lat, m.lng) <= m.serviceRadiusKm,
      )
    const sort = f.sort ?? 'relevance'
    items = [...items].sort((a, b) => {
      if (sort === 'price_asc') return priceFor(a, f.hireType) - priceFor(b, f.hireType)
      if (sort === 'price_desc') return priceFor(b, f.hireType) - priceFor(a, f.hireType)
      if (sort === 'rating') return (b.supplierRating ?? 0) - (a.supplierRating ?? 0)
      if (point)
        return (
          distanceKm(point.lat, point.lng, a.lat, a.lng) -
          distanceKm(point.lat, point.lng, b.lat, b.lng)
        )
      return 0
    })
    const pageSize = f.pageSize ?? 10
    const page = Math.max(1, f.page ?? 1)
    return {
      items: items.slice((page - 1) * pageSize, page * pageSize),
      total: items.length,
      page,
      pageSize,
    }
  }

  private blockingFor(machineId: string, exceptId?: string) {
    return this.db.bookings.filter(
      (b) =>
        b.machineId === machineId &&
        b.id !== exceptId &&
        (BLOCKING_STATUSES as readonly string[]).includes(b.status),
    )
  }

  async getMachine(id: string) {
    await wait(80)
    const m = this.db.machines.find((x) => x.id === id)
    if (!m) return null
    if (m.status !== 'live') {
      // Non-live listings are visible to their supplier and platform admins only.
      const s = this.session()
      const p = s && this.db.profiles.find((x) => x.id === s.profileId)
      if (!p || (!p.isPlatformAdmin && p.orgId !== m.supplierOrgId)) return null
    }
    return this.decorate(m)
  }

  private decorate(m: Machine): Machine {
    const org = this.db.organisations.find((o) => o.id === m.supplierOrgId)
    return {
      ...m,
      supplierName: org?.name ?? m.supplierName,
      supplierRating: org?.rating ?? null,
      supplierReviews: org?.reviewCount ?? 0,
    }
  }

  // ---- bookings ------------------------------------------------------------------
  private view(b: Booking): BookingView {
    const machine = this.db.machines.find((m) => m.id === b.machineId)
    const contractor = this.db.organisations.find((o) => o.id === b.contractorOrgId)
    const supplier = this.db.organisations.find((o) => o.id === b.supplierOrgId)
    if (!machine || !contractor || !supplier)
      throw new ApiError('Booking data is incomplete.', 'unknown')
    const site = this.db.sites.find((s) => s.id === b.siteId) ?? null
    const creator = this.db.profiles.find((p) => p.id === b.createdBy)
    const contactName =
      creator?.orgId === contractor.id
        ? creator.fullName
        : site?.contactName || contractor.contactName
    return {
      ...b,
      machine: this.decorate(machine),
      site,
      contractor,
      supplier,
      contactName,
      contactPhone:
        creator?.orgId === contractor.id ? creator.phone : site?.contactPhone || contractor.phone,
      deliveryAddress: site
        ? `${site.address}, ${site.suburb} ${site.state} ${site.postcode}`
        : contractor.address,
      days: hireDays(b.startDate, b.endDate),
    }
  }

  private canSee(b: Booking, p: Profile) {
    return p.isPlatformAdmin || p.orgId === b.contractorOrgId || p.orgId === b.supplierOrgId
  }

  private notifyOrg(
    orgId: string,
    n: Omit<AppNotification, 'id' | 'profileId' | 'read' | 'createdAt'>,
  ) {
    this.db.profiles
      .filter((p) => p.orgId === orgId && p.accountType !== 'operator')
      .forEach((p) =>
        this.db.notifications.unshift({
          ...n,
          id: uid('n'),
          profileId: p.id,
          read: false,
          createdAt: nowIso(),
        }),
      )
  }

  private notifyAdmins(n: Omit<AppNotification, 'id' | 'profileId' | 'read' | 'createdAt'>) {
    this.db.profiles
      .filter((p) => p.isPlatformAdmin)
      .forEach((p) =>
        this.db.notifications.unshift({
          ...n,
          id: uid('n'),
          profileId: p.id,
          read: false,
          createdAt: nowIso(),
        }),
      )
  }

  private conversationFor(b: Booking): string {
    let c = this.db.conversations.find((x) => x.bookingId === b.id)
    if (!c) {
      const machine = this.db.machines.find((m) => m.id === b.machineId)
      c = {
        id: uid('conv'),
        title: '',
        subtitle: `${machine?.title ?? 'Hire'} · ${b.ref}`,
        bookingId: b.id,
        participantOrgIds: [b.contractorOrgId, b.supplierOrgId],
        lastMessage: '',
        lastMessageAt: nowIso(),
        unreadCount: 0,
        online: false,
        avatarUrl: null,
      }
      this.db.conversations.unshift(c)
    }
    return c.id
  }

  private systemMessage(conversationId: string, body: string) {
    const m: Message = {
      id: uid('msg'),
      conversationId,
      senderId: null,
      senderName: 'SiteRun',
      body,
      attachmentName: null,
      system: true,
      createdAt: nowIso(),
      readAt: null,
    }
    this.db.messages.push(m)
    const c = this.db.conversations.find((x) => x.id === conversationId)
    if (c) {
      c.lastMessage = body
      c.lastMessageAt = m.createdAt
    }
    this.events.dispatchEvent(new CustomEvent(`messages:${conversationId}`, { detail: m }))
  }

  async createBooking(input: import('../api').BookingInput) {
    await wait(400)
    const p = this.me()
    const org = this.requireContractorWriter()
    const machine = this.db.machines.find((m) => m.id === input.machineId && m.status === 'live')
    if (!machine) throw new ApiError('This machine is no longer available.', 'not_found')
    if (input.endDate < input.startDate)
      throw new ApiError('End date must be on or after the start date.', 'invalid')
    if (input.startDate < todayStr())
      throw new ApiError('Start date can’t be in the past.', 'invalid')
    if (input.quantity < 1 || input.quantity > 5)
      throw new ApiError('Quantity must be between 1 and 5.', 'invalid')
    if (!machine.hireTypes.includes(input.hireType))
      throw new ApiError('That hire type isn’t offered for this machine.', 'invalid')
    if (input.siteId && !this.db.sites.some((s) => s.id === input.siteId && s.orgId === org.id))
      throw new ApiError('Choose one of your sites.', 'invalid')
    if (
      this.blockingFor(machine.id).some((b) =>
        rangesOverlap(input.startDate, input.endDate, b.startDate, b.endDate),
      )
    ) {
      throw new ApiError('This machine is already booked for those dates.', 'conflict')
    }
    const dailyRate =
      input.hireType === 'wet'
        ? (machine.rates.wetDaily ?? machine.rates.daily)
        : machine.rates.daily
    this.db.sequence += 1
    const b: Booking = {
      id: uid('b'),
      ref: bookingRef(parseISO(input.startDate).getFullYear(), this.db.sequence),
      machineId: machine.id,
      contractorOrgId: org.id,
      supplierOrgId: machine.supplierOrgId,
      siteId: input.siteId,
      operatorProfileId: null,
      createdBy: p.id,
      startDate: input.startDate,
      endDate: input.endDate,
      quantity: input.quantity,
      hireType: input.hireType,
      delivery: input.delivery,
      insurance: input.insurance,
      dailyRate,
      totalCents: bookingTotal(input.startDate, input.endDate, dailyRate, input.quantity),
      status: 'requested',
      customerMessage: input.message ?? '',
      declineReason: null,
      startTime: '07:00',
      endTime: '17:00',
      collection: null,
      createdAt: nowIso(),
    }
    this.db.bookings.push(b)
    const conv = this.conversationFor(b)
    this.systemMessage(conv, `Booking request ${b.ref} sent to ${machine.supplierName}.`)
    if (b.customerMessage) {
      this.db.messages.push({
        id: uid('msg'),
        conversationId: conv,
        senderId: p.id,
        senderName: p.fullName,
        body: b.customerMessage,
        attachmentName: null,
        system: false,
        createdAt: nowIso(),
        readAt: null,
      })
    }
    this.notifyOrg(machine.supplierOrgId, {
      type: 'booking',
      title: 'New Booking Request',
      body: `${org.name} · ${machine.title}`,
      detail: `${hireDays(b.startDate, b.endDate)} days`,
      link: `/supplier/bookings/${b.id}`,
    })
    this.commit('bookings')
    return this.view(b)
  }

  async getBooking(id: string) {
    await wait(80)
    const p = this.me()
    const b = this.db.bookings.find((x) => x.id === id || x.ref === id)
    if (!b || (!this.canSee(b, p) && b.operatorProfileId !== p.id)) return null
    return this.view(b)
  }

  async listMyBookings() {
    await wait()
    const org = this.myOrg()
    return this.db.bookings
      .filter((b) => b.contractorOrgId === org.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((b) => this.view(b))
  }

  async listActiveHires() {
    await wait()
    const org = this.myOrg()
    return this.db.bookings
      .filter(
        (b) =>
          b.contractorOrgId === org.id &&
          ['in_transit', 'on_site', 'return_scheduled'].includes(b.status),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((b) => this.view(b))
  }

  private myBookingForChange(id: string) {
    const org = this.requireContractorWriter()
    const b = this.db.bookings.find((x) => x.id === id && x.contractorOrgId === org.id)
    if (!b) throw new ApiError('Booking not found.', 'not_found')
    return b
  }

  async extendHire(id: string, newEndDate: string) {
    await wait(350)
    const b = this.myBookingForChange(id)
    if (!['confirmed', 'in_transit', 'on_site', 'return_scheduled'].includes(b.status))
      throw new ApiError('Only active hires can be extended.', 'invalid')
    if (newEndDate <= b.endDate)
      throw new ApiError('Choose an end date after the current one.', 'invalid')
    const extraStart = format(addDays(parseISO(b.endDate), 1), 'yyyy-MM-dd')
    if (
      this.blockingFor(b.machineId, b.id).some((o) =>
        rangesOverlap(extraStart, newEndDate, o.startDate, o.endDate),
      )
    ) {
      throw new ApiError('The machine is booked by someone else for part of that time.', 'conflict')
    }
    const extra = differenceInCalendarDays(parseISO(newEndDate), parseISO(b.endDate))
    b.totalCents += extensionCost(b.dailyRate, extra) * b.quantity
    b.endDate = newEndDate
    if (b.status === 'return_scheduled') {
      b.status = 'on_site'
      b.collection = null
    }
    const m = this.db.machines.find((x) => x.id === b.machineId)
    this.systemMessage(
      this.conversationFor(b),
      `Hire ${b.ref} extended by ${extra} days to ${format(parseISO(newEndDate), 'EEE d MMM')}.`,
    )
    this.notifyOrg(b.supplierOrgId, {
      type: 'booking',
      title: 'Hire Extended',
      body: `${m?.title ?? 'Machine'} · ${b.ref}`,
      detail: `+${extra} days`,
      link: `/supplier/bookings/${b.id}`,
    })
    this.commit('bookings')
    return this.view(b)
  }

  async scheduleReturn(id: string, request: import('../types').CollectionRequest) {
    await wait(300)
    const b = this.myBookingForChange(id)
    if (!['on_site', 'return_scheduled'].includes(b.status))
      throw new ApiError('Only machines on site can be returned.', 'invalid')
    if (request.date < todayStr())
      throw new ApiError('Collection date can’t be in the past.', 'invalid')
    b.collection = request
    b.status = 'return_scheduled'
    const m = this.db.machines.find((x) => x.id === b.machineId)
    this.systemMessage(
      this.conversationFor(b),
      `Collection requested for ${format(parseISO(request.date), 'EEE d MMM')} (${request.slot}).`,
    )
    this.notifyOrg(b.supplierOrgId, {
      type: 'booking',
      title: 'Return Scheduled',
      body: `${m?.title ?? 'Machine'} · ${b.ref}`,
      detail: `${format(parseISO(request.date), 'd MMM')}, ${request.slot}`,
      link: `/supplier/bookings/${b.id}`,
    })
    this.commit('bookings')
    return this.view(b)
  }

  async smartSwap(id: string, option: import('@/lib/booking').SwapOptionId) {
    await wait(350)
    const b = this.myBookingForChange(id)
    if (!isActive(b.status) && b.status !== 'confirmed')
      throw new ApiError('Only active hires can be swapped.', 'invalid')
    const opt = SWAP_OPTIONS.find((o) => o.id === option)
    if (!opt) throw new ApiError('Unknown swap option.', 'invalid')
    b.dailyRate = Math.max(0, b.dailyRate + opt.delta)
    const remainingStart = maxDate(todayStr(), b.startDate)
    const past = hireDays(b.startDate, remainingStart) - 1
    b.totalCents =
      past * (b.dailyRate - opt.delta) + hireDays(remainingStart, b.endDate) * b.dailyRate
    this.systemMessage(
      this.conversationFor(b),
      `Smart Swap requested: ${opt.title}. The supplier will confirm availability and collection details.`,
    )
    this.notifyOrg(b.supplierOrgId, {
      type: 'booking',
      title: 'Smart Swap Requested',
      body: `${opt.title} · ${b.ref}`,
      detail: 'Confirm availability',
      link: `/supplier/bookings/${b.id}`,
    })
    this.commit('bookings')
    return this.view(b)
  }

  async cancelBooking(id: string) {
    await wait(250)
    const b = this.myBookingForChange(id)
    if (!['requested', 'confirmed'].includes(b.status))
      throw new ApiError('This booking can no longer be cancelled.', 'invalid')
    b.status = 'cancelled'
    this.systemMessage(this.conversationFor(b), `Booking ${b.ref} was cancelled by the customer.`)
    this.notifyOrg(b.supplierOrgId, {
      type: 'booking',
      title: 'Booking Cancelled',
      body: b.ref,
      detail: '',
      link: `/supplier/bookings/${b.id}`,
    })
    this.commit('bookings')
    return this.view(b)
  }

  async getDelivery(bookingId: string) {
    await wait(60)
    const p = this.me()
    const b = this.db.bookings.find((x) => x.id === bookingId)
    if (!b || !this.canSee(b, p)) return null
    const d = this.db.deliveries.find((x) => x.bookingId === bookingId)
    if (d) return { ...d }
    if (b.status === 'in_transit') return this.createDelivery(b)
    return null
  }

  private createDelivery(b: Booking): Delivery {
    const supplier = this.db.machines.find((m) => m.id === b.machineId)
    const site = this.db.sites.find((s) => s.id === b.siteId)
    const from = {
      label: `${supplier?.suburb ?? 'Supplier yard'}, VIC`,
      lat: supplier?.lat ?? -37.81,
      lng: supplier?.lng ?? 144.96,
    }
    const to = {
      label: site ? `${site.name}, ${site.suburb}, VIC` : 'Site',
      lat: site?.lat ?? -37.8,
      lng: site?.lng ?? 145,
    }
    const route: [number, number][] = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8
      const bend = Math.sin(t * Math.PI) * 0.01
      return [from.lat + (to.lat - from.lat) * t + bend, from.lng + (to.lng - from.lng) * t - bend]
    })
    const d: Delivery = {
      bookingId: b.id,
      stage: 'in_transit',
      origin: from,
      destination: to,
      route,
      progress: 0.05,
      pickedUpAt: nowIso(),
      eta: new Date(Date.now() + 90 * 60_000).toISOString(),
      deliveredAt: null,
    }
    this.db.deliveries.push(d)
    this.persist()
    return { ...d }
  }

  subscribeDelivery(bookingId: string, cb: (d: Delivery) => void) {
    const topic = `delivery:${bookingId}`
    const handler = (e: Event) => cb((e as CustomEvent<Delivery>).detail)
    this.events.addEventListener(topic, handler)
    if (!this.timers.has(topic)) {
      // Simulated GPS: advance along the route every 2 seconds.
      const t = window.setInterval(() => {
        const d = this.db.deliveries.find((x) => x.bookingId === bookingId)
        const b = this.db.bookings.find((x) => x.id === bookingId)
        if (!d || !b || d.stage === 'delivered') {
          window.clearInterval(t)
          this.timers.delete(topic)
          return
        }
        d.progress = Math.min(1, +(d.progress + 0.02).toFixed(3))
        const remainingMin = Math.round((1 - d.progress) * 150)
        d.eta = new Date(Date.now() + remainingMin * 60_000).toISOString()
        d.stage = d.progress >= 1 ? 'delivered' : d.progress >= 0.85 ? 'arriving' : 'in_transit'
        if (d.stage === 'delivered') {
          d.deliveredAt = nowIso()
          b.status = 'on_site'
          const m = this.db.machines.find((x) => x.id === b.machineId)
          this.notifyOrg(b.contractorOrgId, {
            type: 'delivery',
            title: 'Machine Delivered',
            body: m?.title ?? 'Machine',
            detail: 'Now on site',
            link: `/hires/${b.id}`,
          })
          this.commit('bookings')
        } else {
          this.persist()
        }
        this.events.dispatchEvent(new CustomEvent(topic, { detail: { ...d } }))
      }, 2000)
      this.timers.set(topic, t)
    }
    return () => {
      this.events.removeEventListener(topic, handler)
      const t = this.timers.get(topic)
      if (t) {
        window.clearInterval(t)
        this.timers.delete(topic)
      }
    }
  }

  // ---- messaging ---------------------------------------------------------------
  private senderOrg(m: Message) {
    if (!m.senderId) return 'external'
    return this.db.profiles.find((p) => p.id === m.senderId)?.orgId ?? 'external'
  }

  private convView(c: import('../types').Conversation, orgId: string) {
    const otherId = c.participantOrgIds.find((o) => o !== orgId)
    const other = this.db.organisations.find((o) => o.id === otherId)
    const msgs = this.db.messages.filter((m) => m.conversationId === c.id)
    const unread = msgs.filter((m) => !m.system && !m.readAt && this.senderOrg(m) !== orgId).length
    const last = msgs[msgs.length - 1]
    return {
      ...c,
      title: other?.name ?? c.title,
      unreadCount: unread,
      lastMessage: last?.body ?? c.lastMessage,
      lastMessageAt: last?.createdAt ?? c.lastMessageAt,
    }
  }

  private myConversation(id: string) {
    const org = this.myOrg()
    const c = this.db.conversations.find((x) => x.id === id && x.participantOrgIds.includes(org.id))
    if (!c) throw new ApiError('Conversation not found.', 'not_found')
    return { c, org }
  }

  async listConversations() {
    await wait()
    const org = this.myOrg()
    return this.db.conversations
      .filter((c) => c.participantOrgIds.includes(org.id))
      .map((c) => this.convView(c, org.id))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  }

  async getConversation(id: string) {
    await wait(40)
    try {
      const { c, org } = this.myConversation(id)
      return this.convView(c, org.id)
    } catch {
      return null
    }
  }

  async listMessages(conversationId: string) {
    await wait(60)
    this.myConversation(conversationId)
    return this.db.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  async sendMessage(conversationId: string, body: string, attachment?: File | null) {
    await wait(150)
    const p = this.me()
    const { c, org } = this.myConversation(conversationId)
    const text = body.trim()
    if (!text && !attachment) throw new ApiError('Type a message first.', 'invalid')
    if (text.length > 2000)
      throw new ApiError('Messages are limited to 2,000 characters.', 'invalid')
    const m: Message = {
      id: uid('msg'),
      conversationId,
      senderId: p.id,
      senderName: p.fullName,
      body: text,
      attachmentName: attachment?.name ?? null,
      system: false,
      createdAt: nowIso(),
      readAt: null,
    }
    this.db.messages.push(m)
    c.lastMessage = text || `📎 ${attachment?.name}`
    c.lastMessageAt = m.createdAt
    const other = c.participantOrgIds.find((o) => o !== org.id)
    if (other)
      this.notifyOrg(other, {
        type: 'message',
        title: 'New Message',
        body: `From ${org.name}`,
        detail: `“${text.slice(0, 40)}${text.length > 40 ? '…' : ''}”`,
        link: `/messages/${c.id}`,
      })
    this.events.dispatchEvent(new CustomEvent(`messages:${conversationId}`, { detail: m }))
    this.commit('conversations')
    return m
  }

  async markConversationRead(conversationId: string) {
    const { org } = this.myConversation(conversationId)
    let changed = false
    this.db.messages
      .filter(
        (m) => m.conversationId === conversationId && !m.readAt && this.senderOrg(m) !== org.id,
      )
      .forEach((m) => {
        m.readAt = nowIso()
        changed = true
      })
    if (changed) this.commit('conversations')
  }

  subscribeMessages(conversationId: string, cb: (m: Message) => void) {
    const handler = (e: Event) => cb((e as CustomEvent<Message>).detail)
    this.events.addEventListener(`messages:${conversationId}`, handler)
    return () => this.events.removeEventListener(`messages:${conversationId}`, handler)
  }

  async openConversationForBooking(bookingId: string) {
    const p = this.me()
    const b = this.db.bookings.find((x) => x.id === bookingId)
    if (!b || !this.canSee(b, p)) throw new ApiError('Booking not found.', 'not_found')
    const id = this.conversationFor(b)
    this.commit('conversations')
    return id
  }

  // ---- payments ------------------------------------------------------------------
  async getAccountBalance() {
    await wait(60)
    const org = this.myOrg()
    return this.db.invoices
      .filter((i) => i.orgId === org.id && i.status !== 'paid')
      .reduce((s, i) => s + i.amountCents + i.gstCents, 0)
  }

  async listPaymentMethods() {
    await wait(60)
    const org = this.myOrg()
    return this.db.paymentMethods.filter((m) => m.orgId === org.id)
  }

  async addPaymentMethod(card: import('../api').CardInput) {
    await wait(400)
    const org = this.myOrg()
    if (!/^\d{4}$/.test(card.last4)) throw new ApiError('Invalid card.', 'invalid')
    const expiry = new Date(card.expYear, card.expMonth, 0)
    if (expiry < new Date()) throw new ApiError('This card has expired.', 'invalid')
    const pm = {
      id: uid('pm'),
      orgId: org.id,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      isDefault: !this.db.paymentMethods.some((m) => m.orgId === org.id),
    }
    this.db.paymentMethods.push(pm)
    this.commit('billing')
    return pm
  }

  async removePaymentMethod(id: string) {
    await wait()
    const org = this.myOrg()
    this.db.paymentMethods = this.db.paymentMethods.filter(
      (m) => !(m.id === id && m.orgId === org.id),
    )
    this.commit('billing')
  }

  async makePayment(amountCents: number, methodId: string) {
    await wait(500)
    const org = this.myOrg()
    if (!this.db.paymentMethods.some((m) => m.id === methodId && m.orgId === org.id))
      throw new ApiError('Choose a saved card.', 'invalid')
    if (!Number.isInteger(amountCents) || amountCents <= 0)
      throw new ApiError('Enter an amount above $0.', 'invalid')
    const balance = await this.getAccountBalance()
    if (amountCents > balance) throw new ApiError('That’s more than your balance.', 'invalid')
    let remaining = amountCents
    for (const inv of this.db.invoices
      .filter((i) => i.orgId === org.id && i.status !== 'paid')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))) {
      const due = inv.amountCents + inv.gstCents
      if (remaining >= due) {
        inv.status = 'paid'
        remaining -= due
      }
    }
    this.db.payments.push({
      id: uid('pay'),
      orgId: org.id,
      amountCents,
      methodId,
      kind: 'balance',
      description: 'Account payment',
      status: 'succeeded',
      createdAt: nowIso(),
    })
    this.commit('billing')
  }

  async listInvoices() {
    await wait()
    const org = this.myOrg()
    return this.db.invoices
      .filter((i) => i.orgId === org.id)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
  }

  async getInvoice(id: string) {
    await wait(40)
    const org = this.myOrg()
    return this.db.invoices.find((i) => i.id === id && i.orgId === org.id) ?? null
  }

  // ---- notifications -----------------------------------------------------------
  async listNotifications() {
    await wait(60)
    const p = this.me()
    return this.db.notifications
      .filter((n) => n.profileId === p.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async markNotificationRead(id: string) {
    const p = this.me()
    const n = this.db.notifications.find((x) => x.id === id && x.profileId === p.id)
    if (n && !n.read) {
      n.read = true
      this.commit('notifications')
    }
  }

  async markAllNotificationsRead() {
    await wait()
    const p = this.me()
    this.db.notifications.filter((n) => n.profileId === p.id).forEach((n) => (n.read = true))
    this.commit('notifications')
  }

  subscribeNotifications(cb: () => void) {
    return this.on('*', cb)
  }

  // ---- supplier listings -------------------------------------------------------
  private myMachine(id: string) {
    const org = this.requireSupplier()
    const m = this.db.machines.find((x) => x.id === id && x.supplierOrgId === org.id)
    if (!m) throw new ApiError('Listing not found.', 'not_found')
    return m
  }

  async listMyMachines() {
    await wait()
    const org = this.myOrg()
    return this.db.machines.filter((m) => m.supplierOrgId === org.id).map((m) => this.decorate(m))
  }

  async createMachineDraft(categoryId: string) {
    await wait(200)
    const org = this.requireSupplier()
    const cat = this.db.categories.find((c) => c.id === categoryId)
    if (!cat) throw new ApiError('Choose a category.', 'invalid')
    const m: Machine = {
      id: uid('m'),
      supplierOrgId: org.id,
      supplierName: org.name,
      supplierRating: org.rating,
      supplierReviews: org.reviewCount,
      categoryId,
      title: singular(cat.name),
      make: '',
      model: '',
      year: null,
      serialNumber: '',
      registration: '',
      assetCode: '',
      photos: [],
      specs: {},
      attachments: [],
      fuelType: '',
      features: [],
      capacityTonnes: null,
      rates: { hourly: null, daily: 0, weekly: null, wetDaily: null },
      hireTypes: ['dry'],
      minBooking: '1 day',
      availableFrom: todayStr(),
      suburb: 'Melbourne',
      state: 'VIC',
      lat: -37.8136,
      lng: 144.9631,
      serviceRadiusKm: 50,
      offerDelivery: true,
      sameDayDelivery: false,
      thirdPartyTransport: false,
      status: 'draft',
      rejectionReason: null,
      submittedAt: null,
      approvedAt: null,
      draftStep: 1,
      createdAt: nowIso(),
    }
    this.db.machines.push(m)
    this.commit('machines')
    return { ...m }
  }

  async saveMachineDraft(id: string, patch: MachineDraft) {
    await wait(150)
    const m = this.myMachine(id)
    if (m.status === 'pending_review')
      throw new ApiError('This listing is being reviewed and can’t be edited right now.', 'invalid')
    Object.assign(m, patch, { draftStep: Math.max(m.draftStep, patch.draftStep ?? 0) })
    if (m.status === 'rejected') m.status = 'draft'
    this.commit('machines')
    return this.decorate(m)
  }

  async uploadMachinePhoto(id: string, file: File) {
    this.myMachine(id)
    if (!file.type.startsWith('image/')) throw new ApiError('Photos must be images.', 'invalid')
    return fileToDataUrl(file)
  }

  private requirementsFor(m: Machine) {
    const groups = this.db.categories.find((c) => c.id === m.categoryId)?.requirementGroups ?? [
      'general',
    ]
    return this.db.requirements.filter((r) => (groups as string[]).includes(r.group))
  }

  private latestDoc(machineId: string, requirementId: string) {
    return this.db.documents
      .filter((d) => d.machineId === machineId && d.requirementId === requirementId)
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0]
  }

  async submitMachine(id: string) {
    await wait(400)
    const m = this.myMachine(id)
    if (m.status !== 'draft' && m.status !== 'rejected')
      throw new ApiError('Only drafts can be submitted.', 'invalid')
    const missing: string[] = []
    if (!m.make || !m.model) missing.push('machine details')
    if (m.photos.length === 0) missing.push('at least one photo')
    if (!m.rates.daily) missing.push('a daily rate')
    const docsMissing = this.requirementsFor(m).filter(
      (r) =>
        r.required &&
        (!this.latestDoc(m.id, r.id) || this.latestDoc(m.id, r.id)?.status === 'rejected'),
    )
    if (docsMissing.length) missing.push(`documents: ${docsMissing.map((r) => r.name).join(', ')}`)
    if (missing.length)
      throw new ApiError(`Add ${missing.join('; ')} before submitting.`, 'invalid')
    m.status = 'pending_review'
    m.submittedAt = nowIso()
    m.rejectionReason = null
    const org = this.db.organisations.find((o) => o.id === m.supplierOrgId)
    this.notifyAdmins({
      type: 'listing',
      title: 'Listing Submitted',
      body: `${m.title} · ${org?.name}`,
      detail: 'Awaiting review',
      link: `/admin/approvals/machines/${m.id}`,
    })
    this.commit('machines')
    return this.decorate(m)
  }

  async setMachinePaused(id: string, paused: boolean) {
    await wait()
    const m = this.myMachine(id)
    if (paused && m.status !== 'live')
      throw new ApiError('Only live listings can be paused.', 'invalid')
    if (!paused && m.status !== 'paused')
      throw new ApiError('This listing isn’t paused.', 'invalid')
    m.status = paused ? 'paused' : 'live'
    this.commit('machines')
    return this.decorate(m)
  }

  // ---- compliance --------------------------------------------------------------
  async listRequirements() {
    await wait(40)
    return [...this.db.requirements].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  private canSeeDoc(d: ComplianceDocument, p: Profile) {
    return p.isPlatformAdmin || d.orgId === p.orgId || d.profileId === p.id
  }

  async listDocuments(filter: { machineId?: string; profileId?: string }) {
    await wait()
    const p = this.me()
    return this.db.documents
      .filter((d) => this.canSeeDoc(d, p))
      .filter((d) => (filter.machineId ? d.machineId === filter.machineId : true))
      .filter((d) => (filter.profileId ? d.profileId === filter.profileId : true))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  }

  async listOrgDocuments() {
    await wait()
    const org = this.myOrg()
    return this.db.documents.filter((d) => d.orgId === org.id)
  }

  async uploadDocument(input: import('../api').DocumentUploadInput) {
    await wait(600)
    const p = this.me()
    const org = this.myOrg()
    const okType = ['application/pdf', 'image/jpeg', 'image/png'].includes(input.file.type)
    if (!okType) throw new ApiError('Upload a PDF, JPG or PNG file.', 'invalid')
    if (input.file.size > 10 * 1024 * 1024)
      throw new ApiError('Files must be 10MB or smaller.', 'invalid')
    if (
      input.machineId &&
      !this.db.machines.some((m) => m.id === input.machineId && m.supplierOrgId === org.id)
    )
      throw new ApiError('Listing not found.', 'not_found')
    if (input.profileId && input.profileId !== p.id && p.accountType === 'operator')
      throw new ApiError('You can only upload your own documents.', 'forbidden')
    const req = this.db.requirements.find((r) => r.id === input.requirementId)
    if (!req) throw new ApiError('Choose a document type.', 'invalid')
    const url = input.file.size < 400_000 ? await fileToDataUrl(input.file) : null
    const d: ComplianceDocument = {
      id: uid('doc'),
      orgId: org.id,
      machineId: input.machineId,
      profileId: input.profileId,
      requirementId: input.requirementId,
      fileName: input.file.name,
      fileSize: input.file.size,
      fileUrl: url,
      expiryDate: input.expiryDate,
      status: 'pending',
      notes: input.notes,
      rejectionReason: null,
      uploadedAt: nowIso(),
    }
    this.db.documents.push(d)
    this.notifyAdmins({
      type: 'document',
      title: 'Document Uploaded',
      body: `${req.name} · ${org.name}`,
      detail: 'Awaiting verification',
      link: '/admin/approvals?tab=documents',
    })
    this.commit('documents')
    return d
  }

  async getDocumentUrl(id: string) {
    const p = this.me()
    const d = this.db.documents.find((x) => x.id === id)
    if (!d || !this.canSeeDoc(d, p)) throw new ApiError('Document not found.', 'not_found')
    return d.fileUrl
  }

  // ---- supplier bookings & money ---------------------------------------------------
  async listSupplierBookings() {
    await wait()
    const org = this.requireSupplier()
    return this.db.bookings
      .filter((b) => b.supplierOrgId === org.id)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((b) => this.view(b))
  }

  async respondToBooking(id: string, accept: boolean, reason?: string) {
    await wait(350)
    const org = this.requireSupplier()
    const b = this.db.bookings.find((x) => x.id === id && x.supplierOrgId === org.id)
    if (!b) throw new ApiError('Booking not found.', 'not_found')
    if (b.status !== 'requested')
      throw new ApiError('This request has already been answered.', 'conflict')
    if (
      accept &&
      this.blockingFor(b.machineId, b.id).some((o) =>
        rangesOverlap(b.startDate, b.endDate, o.startDate, o.endDate),
      )
    ) {
      throw new ApiError(
        'You already have a confirmed booking for this machine on those dates.',
        'conflict',
      )
    }
    b.status = accept ? 'confirmed' : 'declined'
    b.declineReason = accept ? null : reason?.trim() || 'Not available for those dates.'
    const m = this.db.machines.find((x) => x.id === b.machineId)
    const conv = this.conversationFor(b)
    this.systemMessage(
      conv,
      accept
        ? `Booking ${b.ref} was confirmed by ${org.name}.`
        : `Booking ${b.ref} was declined by ${org.name}. ${b.declineReason}`,
    )
    this.notifyOrg(b.contractorOrgId, {
      type: 'booking',
      title: accept ? 'Booking Confirmed' : 'Booking Declined',
      body: m?.title ?? 'Machine',
      detail: accept ? format(parseISO(b.startDate), 'EEE, d MMM yyyy') : (b.declineReason ?? ''),
      link: `/bookings/${b.id}/confirmed`,
    })
    this.commit('bookings')
    return this.view(b)
  }

  async advanceBooking(id: string, to: 'in_transit' | 'on_site' | 'completed') {
    await wait(300)
    const org = this.requireSupplier()
    const b = this.db.bookings.find((x) => x.id === id && x.supplierOrgId === org.id)
    if (!b) throw new ApiError('Booking not found.', 'not_found')
    const allowed: Record<typeof to, BookingStatus[]> = {
      in_transit: ['confirmed'],
      on_site: ['confirmed', 'in_transit'],
      completed: ['on_site', 'return_scheduled'],
    }
    if (!allowed[to].includes(b.status))
      throw new ApiError(
        `Can’t move a ${b.status.replace('_', ' ')} booking to ${to.replace('_', ' ')}.`,
        'invalid',
      )
    const m = this.db.machines.find((x) => x.id === b.machineId)
    const conv = this.conversationFor(b)
    b.status = to
    if (to === 'in_transit') {
      if (!this.db.deliveries.some((d) => d.bookingId === b.id)) this.createDelivery(b)
      this.systemMessage(conv, `${m?.title ?? 'Machine'} has left the yard and is on its way.`)
      this.notifyOrg(b.contractorOrgId, {
        type: 'delivery',
        title: 'Delivery Update',
        body: 'Machine out for delivery',
        detail: m?.title ?? '',
        link: `/hires/${b.id}/tracking`,
      })
    } else if (to === 'on_site') {
      const d = this.db.deliveries.find((x) => x.bookingId === b.id)
      if (d) {
        d.stage = 'delivered'
        d.progress = 1
        d.deliveredAt = nowIso()
      }
      this.systemMessage(conv, `${m?.title ?? 'Machine'} was delivered to site.`)
      this.notifyOrg(b.contractorOrgId, {
        type: 'delivery',
        title: 'Machine Delivered',
        body: m?.title ?? 'Machine',
        detail: 'Now on site',
        link: `/hires/${b.id}`,
      })
    } else {
      const n = 1046 + this.db.invoices.filter((i) => i.orgId === b.contractorOrgId).length
      const due = format(addDays(new Date(), 14), 'yyyy-MM-dd')
      this.db.invoices.push({
        id: uid('invc'),
        number: `INV-${n}`,
        orgId: b.contractorOrgId,
        bookingId: b.id,
        issuedAt: todayStr(),
        dueDate: due,
        amountCents: b.totalCents,
        gstCents: gstOf(b.totalCents),
        status: 'due',
        lines: [
          {
            description: `${m?.title ?? 'Hire'} (${m?.make} ${m?.model}), ${b.startDate} to ${b.endDate}`,
            amountCents: b.totalCents,
          },
        ],
      })
      this.systemMessage(conv, `Hire ${b.ref} is complete. Invoice INV-${n} has been issued.`)
      this.notifyOrg(b.contractorOrgId, {
        type: 'invoice',
        title: 'New Invoice',
        body: `INV-${n} is now available`,
        detail: ((b.totalCents * 1.1) / 100).toLocaleString('en-AU', {
          style: 'currency',
          currency: 'AUD',
        }),
        link: '/invoices',
      })
    }
    this.commit('bookings')
    return this.view(b)
  }

  private earnedCents(orgId: string) {
    return this.db.bookings
      .filter((b) => b.supplierOrgId === orgId && b.status === 'completed')
      .reduce((s, b) => s + Math.round(b.totalCents * 0.9), 0)
  }

  async getPayoutSummary() {
    await wait()
    const org = this.requireSupplier()
    const paid = this.db.payouts
      .filter((p) => p.orgId === org.id)
      .reduce((s, p) => s + p.amountCents, 0)
    const available = Math.max(
      0,
      (this.db.openingEarnings[org.id] ?? 0) + this.earnedCents(org.id) - paid,
    )
    const today = todayStr()
    const in30 = (d: string) => d > format(subDays(new Date(), 30), 'yyyy-MM-dd') && d <= today
    const prev30 = (d: string) =>
      d > format(subDays(new Date(), 60), 'yyyy-MM-dd') &&
      d <= format(subDays(new Date(), 30), 'yyyy-MM-dd')
    const mine = this.db.bookings.filter(
      (b) => b.supplierOrgId === org.id && b.status === 'completed',
    )
    const cur = mine.filter((b) => in30(b.endDate))
    const prev = mine.filter((b) => prev30(b.endDate))
    const revenue = cur.reduce((s, b) => s + b.totalCents, 0)
    const prevRevenue = prev.reduce((s, b) => s + b.totalCents, 0)
    return {
      availableCents: available,
      totalRevenueCents: revenue,
      revenueTrend: pct(revenue, prevRevenue),
      completedHires: cur.length,
      completedTrend: pct(cur.length, prev.length),
    }
  }

  async listPayouts() {
    await wait()
    const org = this.requireSupplier()
    return this.db.payouts
      .filter((p) => p.orgId === org.id)
      .sort((a, b) => (b.paidAt ?? b.requestedAt).localeCompare(a.paidAt ?? a.requestedAt))
  }

  async requestPayout() {
    await wait(500)
    const org = this.requireSupplier()
    if (this.myRole() !== 'owner')
      throw new ApiError('Only the owner can request payouts.', 'forbidden')
    const { availableCents } = await this.getPayoutSummary()
    if (availableCents <= 0)
      throw new ApiError('There’s nothing available to pay out yet.', 'invalid')
    const payout = {
      id: uid('po'),
      orgId: org.id,
      amountCents: availableCents,
      status: 'processing' as const,
      requestedAt: nowIso(),
      paidAt: null,
    }
    this.db.payouts.push(payout)
    this.db.activity.unshift({
      id: uid('a'),
      kind: 'payout',
      title: 'Payout requested',
      detail: `${(availableCents / 100).toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} to ${org.name}`,
      createdAt: nowIso(),
    })
    this.commit('payouts')
    return payout
  }

  async getPerformance(range: '30d' | '90d' | '1y') {
    await wait()
    const org = this.requireSupplier()
    const now = new Date()
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 365
    const from = subDays(now, days)
    const prevFrom = subDays(from, days)
    const counted = (b: Booking) =>
      ['confirmed', 'in_transit', 'on_site', 'return_scheduled', 'completed'].includes(b.status)
    const mine = this.db.bookings.filter((b) => b.supplierOrgId === org.id && counted(b))
    const within = (b: Booking, a: Date, z: Date) =>
      parseISO(b.startDate) > a && parseISO(b.startDate) <= z
    const cur = mine.filter((b) => within(b, from, now))
    const prev = mine.filter((b) => within(b, prevFrom, from))
    const bookedDays = (list: Booking[], a: Date, z: Date) =>
      list.reduce((s, b) => {
        const st = maxDate(format(a, 'yyyy-MM-dd'), b.startDate)
        const en = minDate(format(z, 'yyyy-MM-dd'), b.endDate)
        return s + Math.max(0, hireDays(st, en))
      }, 0)
    const activeMachines = new Set(cur.map((b) => b.machineId)).size || 1
    const prevMachines = new Set(prev.map((b) => b.machineId)).size || 1
    const util = Math.min(
      100,
      Math.round((bookedDays(cur, from, now) / (activeMachines * days)) * 100),
    )
    const prevUtil = Math.min(
      100,
      Math.round((bookedDays(prev, prevFrom, from) / (prevMachines * days)) * 100),
    )
    const revenue = cur.reduce((s, b) => s + b.totalCents, 0)
    const prevRevenue = prev.reduce((s, b) => s + b.totalCents, 0)

    let trend: { label: string; hires: number }[]
    if (range === '1y') {
      trend = Array.from({ length: 12 }, (_, i) => {
        const m = subMonths(now, 11 - i)
        const a = startOfMonth(m)
        const z = endOfMonth(m)
        return {
          label: format(m, 'MMM'),
          hires: mine.filter((b) => within(b, subDays(a, 1), z)).length,
        }
      })
    } else {
      const step = range === '30d' ? 1 : 7
      const buckets = eachDayOfInterval({ start: addDays(from, 1), end: now }).filter(
        (_, i) => i % step === 0,
      )
      trend = buckets.map((d) => ({
        label: format(d, 'd MMM'),
        hires: mine.filter((b) => {
          const s = parseISO(b.startDate)
          const e = parseISO(b.endDate)
          return step === 1 ? s <= d && e >= d : s <= addDays(d, 6) && e >= d
        }).length,
      }))
    }

    const byMachine = new Map<string, Booking[]>()
    cur.forEach((b) => byMachine.set(b.machineId, [...(byMachine.get(b.machineId) ?? []), b]))
    const topMachines = [...byMachine.entries()]
      .map(([machineId, list]) => ({
        machineId,
        title: this.db.machines.find((m) => m.id === machineId)?.title ?? '',
        hires: list.length,
        utilisation: Math.min(100, Math.round((bookedDays(list, from, now) / days) * 100 * 1.25)),
      }))
      .sort((a, b) => b.hires - a.hires)
      .slice(0, 3)

    return {
      hires: cur.length,
      hiresTrend: pct(cur.length, prev.length),
      utilisation: util,
      utilisationTrend: util - prevUtil,
      revenueCents: revenue,
      revenueTrend: pct(revenue, prevRevenue),
      trend,
      topMachines,
    }
  }

  // ---- operator ----------------------------------------------------------------------
  async listOperatorBookings() {
    await wait()
    const p = this.me()
    return this.db.bookings
      .filter((b) => b.operatorProfileId === p.id && !['declined', 'cancelled'].includes(b.status))
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((b) => this.view(b))
  }

  // ---- support -----------------------------------------------------------------------
  async listTickets() {
    await wait()
    const org = this.myOrg()
    return this.db.tickets
      .filter((t) => t.orgId === org.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async createTicket(input: { subject: string; category: string; description: string }) {
    await wait(300)
    const org = this.myOrg()
    if (input.subject.trim().length < 3) throw new ApiError('Add a short subject.', 'invalid')
    const n = 4600 + this.db.tickets.length
    const t = {
      id: uid('t'),
      ref: `#SR-${n}`,
      orgId: org.id,
      subject: input.subject.trim(),
      category: input.category,
      description: input.description.trim(),
      status: 'open' as const,
      createdAt: nowIso(),
    }
    this.db.tickets.push(t)
    this.commit('tickets')
    return t
  }

  // ---- admin -------------------------------------------------------------------------
  async getAdminStats(range: TimeRange) {
    await wait()
    this.requireAdmin()
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[range]
    const now = new Date()
    const from = subDays(now, days)
    const prevFrom = subDays(from, days)
    const inRange = (iso: string, a: Date, z: Date) => new Date(iso) > a && new Date(iso) <= z
    const bookings = this.db.bookings
    const payouts = this.db.payouts
    const disputes = this.db.activity.filter((a) => a.kind === 'dispute')
    const cnt = <T>(list: T[], get: (x: T) => string, a: Date, z: Date) =>
      list.filter((x) => inRange(get(x), a, z)).length
    const orgsCreated = this.db.organisations
    const sum = (list: typeof payouts, a: Date, z: Date) =>
      list
        .filter((p) => inRange(p.paidAt ?? p.requestedAt, a, z))
        .reduce((s, p) => s + p.amountCents, 0)
    return {
      users: this.db.profiles.length,
      usersTrend: pct(
        cnt(orgsCreated, (o) => o.createdAt, from, now),
        cnt(orgsCreated, (o) => o.createdAt, prevFrom, from),
      ),
      suppliers: this.db.organisations.filter((o) => o.kind === 'supplier').length,
      suppliersTrend: pct(
        cnt(
          orgsCreated.filter((o) => o.kind === 'supplier'),
          (o) => o.createdAt,
          from,
          now,
        ),
        cnt(
          orgsCreated.filter((o) => o.kind === 'supplier'),
          (o) => o.createdAt,
          prevFrom,
          from,
        ),
      ),
      bookings: cnt(bookings, (b) => b.createdAt, from, now),
      bookingsTrend: pct(
        cnt(bookings, (b) => b.createdAt, from, now),
        cnt(bookings, (b) => b.createdAt, prevFrom, from),
      ),
      payoutsCents: sum(payouts, from, now),
      payoutsTrend: pct(sum(payouts, from, now), sum(payouts, prevFrom, from)),
      disputes: cnt(disputes, (d) => d.createdAt, from, now),
      disputesTrend: pct(
        cnt(disputes, (d) => d.createdAt, from, now),
        cnt(disputes, (d) => d.createdAt, prevFrom, from),
      ),
    }
  }

  async listAdminActivity() {
    await wait()
    this.requireAdmin()
    return [...this.db.activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async listPendingMachines() {
    await wait()
    this.requireAdmin()
    return this.db.machines
      .filter((m) => m.status === 'pending_review')
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
      .map((m) => this.decorate(m))
  }

  async listPendingDocuments() {
    await wait()
    this.requireAdmin()
    return this.db.documents
      .filter((d) => d.status === 'pending')
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
      .map((d) => ({
        ...d,
        orgName: this.db.organisations.find((o) => o.id === d.orgId)?.name ?? '',
        machineTitle: d.machineId
          ? (this.db.machines.find((m) => m.id === d.machineId)?.title ?? null)
          : (this.db.profiles.find((p) => p.id === d.profileId)?.fullName ?? null),
      }))
  }

  async reviewMachine(id: string, approve: boolean, reason?: string) {
    await wait(400)
    this.requireAdmin()
    const m = this.db.machines.find((x) => x.id === id)
    if (!m) throw new ApiError('Listing not found.', 'not_found')
    if (m.status !== 'pending_review')
      throw new ApiError('This listing isn’t waiting for review.', 'conflict')
    const org = this.db.organisations.find((o) => o.id === m.supplierOrgId)
    if (approve) {
      const unverified = this.requirementsFor(m).filter(
        (r) => r.required && this.latestDoc(m.id, r.id)?.status !== 'verified',
      )
      if (unverified.length)
        throw new ApiError(
          `Verify these documents first: ${unverified.map((r) => r.name).join(', ')}.`,
          'invalid',
        )
      m.status = 'live'
      m.approvedAt = nowIso()
      this.notifyOrg(m.supplierOrgId, {
        type: 'listing',
        title: 'Your listing is live!',
        body: `${m.title} · ${m.make} ${m.model}`,
        detail: 'Now visible to customers',
        link: `/supplier/machines/${m.id}/live`,
      })
      this.db.activity.unshift({
        id: uid('a'),
        kind: 'machine_approved',
        title: 'Machine approved',
        detail: `${m.title} – ${org?.name}`,
        createdAt: nowIso(),
      })
    } else {
      if (!reason?.trim())
        throw new ApiError('Add a reason so the supplier knows what to fix.', 'invalid')
      m.status = 'rejected'
      m.rejectionReason = reason.trim()
      this.notifyOrg(m.supplierOrgId, {
        type: 'listing',
        title: 'Listing Needs Changes',
        body: `${m.title} · ${m.make} ${m.model}`,
        detail: reason.trim(),
        link: `/supplier/machines/${m.id}/review`,
      })
      this.db.activity.unshift({
        id: uid('a'),
        kind: 'machine_rejected',
        title: 'Machine rejected',
        detail: `${m.title} – ${org?.name}`,
        createdAt: nowIso(),
      })
    }
    this.commit('machines')
    return this.decorate(m)
  }

  async reviewDocument(id: string, approve: boolean, reason?: string) {
    await wait(300)
    this.requireAdmin()
    const d = this.db.documents.find((x) => x.id === id)
    if (!d) throw new ApiError('Document not found.', 'not_found')
    if (!approve && !reason?.trim())
      throw new ApiError('Add a reason so the supplier knows what to fix.', 'invalid')
    d.status = approve ? 'verified' : 'rejected'
    d.rejectionReason = approve ? null : (reason?.trim() ?? null)
    const req = this.db.requirements.find((r) => r.id === d.requirementId)
    const org = this.db.organisations.find((o) => o.id === d.orgId)
    this.notifyOrg(d.orgId, {
      type: 'document',
      title: approve ? 'Document Verified' : 'Document Rejected',
      body: req?.name ?? 'Document',
      detail: approve ? 'Verified by SiteRun' : (reason ?? ''),
      link: d.machineId
        ? `/supplier/machines/${d.machineId}/compliance`
        : '/supplier/compliance/alerts',
    })
    this.db.activity.unshift({
      id: uid('a'),
      kind: approve ? 'document_verified' : 'document_rejected',
      title: approve ? 'Document verified' : 'Document rejected',
      detail: `${req?.name} – ${org?.name}`,
      createdAt: nowIso(),
    })
    this.commit('documents')
    return { ...d }
  }

  async listSupplierOrgs() {
    await wait()
    this.requireAdmin()
    return this.db.organisations
      .filter((o) => o.kind === 'supplier')
      .map((o) => ({
        ...o,
        machineCount: this.db.machines.filter((m) => m.supplierOrgId === o.id).length,
        liveCount: this.db.machines.filter((m) => m.supplierOrgId === o.id && m.status === 'live')
          .length,
      }))
  }

  async listAllBookings() {
    await wait()
    this.requireAdmin()
    return this.db.bookings
      .filter(
        (b) =>
          b.status !== 'completed' || b.endDate >= format(subDays(new Date(), 14), 'yyyy-MM-dd'),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((b) => this.view(b))
  }
}

function isActive(s: BookingStatus) {
  return s === 'in_transit' || s === 'on_site' || s === 'return_scheduled'
}
function priceFor(m: Machine, hireType?: string) {
  return hireType === 'wet' ? (m.rates.wetDaily ?? m.rates.daily) : m.rates.daily
}
function pct(cur: number, prev: number) {
  if (!prev) return cur ? 100 : 0
  return Math.round(((cur - prev) / prev) * 100)
}
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function singular(name: string) {
  return name.replace(/ Equipment$/, ' Equipment').replace(/s$/, '')
}
function maxDate(a: string, b: string) {
  return a > b ? a : b
}
function minDate(a: string, b: string) {
  return a < b ? a : b
}
