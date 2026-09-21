// Row shapes returned by Postgres (snake_case) and their mapping to the domain model.
import type {
  AdminActivity,
  AppNotification,
  Booking,
  BookingView,
  ClientError,
  ComplianceDocument,
  Conversation,
  Delivery,
  Invitation,
  Invoice,
  Machine,
  MachineCategory,
  Message,
  OrgMember,
  Organisation,
  PaymentMethod,
  Payout,
  Profile,
  Site,
  Subscription,
  SupportTicket,
} from '../types'

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come straight from PostgREST */
type Row = Record<string, any>

const time = (t: string | null | undefined) => (t ? t.slice(0, 5) : '')
const num = (v: unknown) => (v === null || v === undefined ? null : Number(v))

export const toProfile = (r: Row, emailVerified = true): Profile => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone,
  accountType: r.account_type,
  isPlatformAdmin: r.is_platform_admin,
  avatarUrl: r.avatar_url,
  orgId: r.org_id,
  emailVerified,
})

export const toOrg = (r: Row): Organisation => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  abn: r.abn,
  contactName: r.contact_name,
  email: r.email,
  phone: r.phone,
  address: r.address,
  rating: num(r.rating),
  reviewCount: r.review_count,
  logoUrl: r.logo_url,
  createdAt: r.created_at,
})

export const orgPatch = (p: Partial<Organisation>): Row => {
  const out: Row = {}
  if (p.name !== undefined) out.name = p.name
  if (p.abn !== undefined) out.abn = p.abn
  if (p.contactName !== undefined) out.contact_name = p.contactName
  if (p.email !== undefined) out.email = p.email
  if (p.phone !== undefined) out.phone = p.phone
  if (p.address !== undefined) out.address = p.address
  if (p.logoUrl !== undefined) out.logo_url = p.logoUrl
  return out
}

export const toMember = (r: Row): OrgMember => ({
  id: r.id,
  orgId: r.org_id,
  profileId: r.profile_id,
  name: r.name,
  email: r.email,
  role: r.role,
})

export const toInvitation = (r: Row): Invitation => ({
  id: r.id,
  orgId: r.org_id,
  email: r.email,
  role: r.role,
  status: r.status,
  createdAt: r.created_at,
})

export const toSite = (r: Row): Site => ({
  id: r.id,
  orgId: r.org_id,
  name: r.name,
  address: r.address,
  suburb: r.suburb,
  state: r.state,
  postcode: r.postcode,
  lat: r.lat,
  lng: r.lng,
  projectType: r.project_type,
  startDate: r.start_date,
  durationMonths: r.duration_months,
  status: r.status,
  deliveryFrom: time(r.delivery_from),
  deliveryTo: time(r.delivery_to),
  accessNotes: r.access_notes,
  contactName: r.contact_name,
  contactPhone: r.contact_phone,
  photoUrl: r.photo_url,
  teamCount: r.team_count,
})

export const sitePatch = (p: Partial<Site>): Row => {
  const map: Record<string, string> = {
    name: 'name',
    address: 'address',
    suburb: 'suburb',
    state: 'state',
    postcode: 'postcode',
    lat: 'lat',
    lng: 'lng',
    projectType: 'project_type',
    startDate: 'start_date',
    durationMonths: 'duration_months',
    status: 'status',
    deliveryFrom: 'delivery_from',
    deliveryTo: 'delivery_to',
    accessNotes: 'access_notes',
    contactName: 'contact_name',
    contactPhone: 'contact_phone',
  }
  const out: Row = {}
  for (const [k, col] of Object.entries(map)) {
    const v = (p as Row)[k]
    if (v !== undefined) out[col] = v
  }
  return out
}

export const toSubscription = (r: Row): Subscription => ({
  orgId: r.org_id,
  plan: r.plan,
  period: r.period,
  status: r.status,
  creditsBalance: r.credits_balance,
  renewsAt: r.renews_at,
})

export const toCategory = (r: Row): MachineCategory => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  imageUrl: r.image_url,
  icon: r.icon,
  requirementGroups: r.requirement_groups,
  sortOrder: r.sort_order,
})

/** From machine_details (or its to_jsonb copy inside booking_details). */
export const toMachine = (r: Row): Machine => ({
  id: r.id,
  supplierOrgId: r.supplier_org_id,
  supplierName: r.supplier_name ?? '',
  supplierRating: num(r.supplier_rating),
  supplierReviews: r.supplier_reviews ?? 0,
  categoryId: r.category_id,
  title: r.title,
  make: r.make,
  model: r.model,
  year: r.year,
  serialNumber: r.serial_number,
  registration: r.registration,
  assetCode: r.asset_code,
  photos: r.photos ?? [],
  specs: r.specs ?? {},
  attachments: r.attachments ?? [],
  fuelType: r.fuel_type,
  features: r.features ?? [],
  capacityTonnes: num(r.capacity_tonnes),
  rates: {
    hourly: r.rate_hourly,
    daily: r.rate_daily,
    weekly: r.rate_weekly,
    wetDaily: r.rate_wet_daily,
  },
  hireTypes: r.hire_types,
  minBooking: r.min_booking,
  availableFrom: r.available_from,
  suburb: r.suburb,
  state: r.state,
  lat: r.lat,
  lng: r.lng,
  serviceRadiusKm: r.service_radius_km,
  offerDelivery: r.offer_delivery,
  sameDayDelivery: r.same_day_delivery,
  thirdPartyTransport: r.third_party_transport,
  status: r.status,
  rejectionReason: r.rejection_reason,
  submittedAt: r.submitted_at,
  approvedAt: r.approved_at,
  draftStep: r.draft_step,
  createdAt: r.created_at,
})

export const machinePatch = (p: Partial<Machine>): Row => {
  const direct: Record<string, string> = {
    categoryId: 'category_id',
    title: 'title',
    make: 'make',
    model: 'model',
    year: 'year',
    serialNumber: 'serial_number',
    registration: 'registration',
    assetCode: 'asset_code',
    specs: 'specs',
    attachments: 'attachments',
    fuelType: 'fuel_type',
    features: 'features',
    capacityTonnes: 'capacity_tonnes',
    hireTypes: 'hire_types',
    minBooking: 'min_booking',
    availableFrom: 'available_from',
    suburb: 'suburb',
    state: 'state',
    lat: 'lat',
    lng: 'lng',
    serviceRadiusKm: 'service_radius_km',
    offerDelivery: 'offer_delivery',
    sameDayDelivery: 'same_day_delivery',
    thirdPartyTransport: 'third_party_transport',
    draftStep: 'draft_step',
  }
  const out: Row = {}
  for (const [k, col] of Object.entries(direct)) {
    const v = (p as Row)[k]
    if (v !== undefined) out[col] = v
  }
  if (p.rates) {
    out.rate_hourly = p.rates.hourly || null
    out.rate_daily = p.rates.daily ?? 0
    out.rate_weekly = p.rates.weekly || null
    out.rate_wet_daily = p.rates.wetDaily || null
  }
  return out
}

export const toDocument = (r: Row): ComplianceDocument => ({
  id: r.id,
  orgId: r.org_id,
  machineId: r.machine_id,
  profileId: r.profile_id,
  requirementId: r.requirement_id,
  fileName: r.file_name,
  fileSize: r.file_size,
  fileUrl: null,
  expiryDate: r.expiry_date,
  status: r.status,
  notes: r.notes,
  rejectionReason: r.rejection_reason,
  uploadedAt: r.uploaded_at,
})

export const toBooking = (r: Row): Booking => ({
  id: r.id,
  ref: r.ref,
  machineId: r.machine_id,
  contractorOrgId: r.contractor_org_id,
  supplierOrgId: r.supplier_org_id,
  siteId: r.site_id,
  operatorProfileId: r.operator_profile_id,
  createdBy: r.created_by,
  startDate: r.start_date,
  endDate: r.end_date,
  quantity: r.quantity,
  hireType: r.hire_type,
  delivery: r.delivery,
  insurance: r.insurance,
  dailyRate: r.daily_rate,
  totalCents: r.total_cents,
  status: r.status,
  customerMessage: r.customer_message,
  declineReason: r.decline_reason,
  startTime: time(r.start_time),
  endTime: time(r.end_time),
  collection: r.collection,
  createdAt: r.created_at,
})

/** From booking_details. */
export const toBookingView = (r: Row): BookingView => ({
  ...toBooking(r),
  machine: toMachine(r.machine),
  site: r.site ? toSite(r.site) : null,
  contractor: toOrg(r.contractor),
  supplier: toOrg(r.supplier),
  contactName: r.contact_name ?? '',
  contactPhone: r.contact_phone ?? '',
  deliveryAddress: r.delivery_address ?? '',
  days: r.days,
})

export const toDelivery = (r: Row): Delivery => ({
  bookingId: r.booking_id,
  stage: r.stage,
  origin: r.origin,
  destination: r.destination,
  route: r.route,
  progress: Number(r.progress),
  pickedUpAt: r.picked_up_at,
  eta: r.eta,
  deliveredAt: r.delivered_at,
  live: r.source === 'gps',
  position: r.position ? [Number(r.position.lat), Number(r.position.lng)] : null,
  positionAt: r.position_at ?? null,
})

export const toClientError = (r: Row): ClientError => ({
  id: Number(r.id),
  message: r.message,
  stack: r.stack,
  url: r.url,
  release: r.release,
  platform: r.platform,
  count: r.count,
  firstSeen: r.first_seen,
  lastSeen: r.last_seen,
  signedIn: !!r.profile_id,
})

/** From conversation_list. */
export const toConversation = (r: Row): Conversation => ({
  id: r.id,
  title: r.title ?? '',
  subtitle: r.subtitle,
  bookingId: r.booking_id,
  participantOrgIds: r.participant_org_ids ?? [],
  lastMessage: r.last_message,
  lastMessageAt: r.last_message_at,
  unreadCount: r.unread_count ?? 0,
  online: false,
  avatarUrl: null,
})

export const toMessage = (r: Row): Message => ({
  id: r.id,
  conversationId: r.conversation_id,
  senderId: r.sender_id,
  senderName: r.sender_name,
  body: r.body,
  attachmentName: r.attachment_name,
  system: r.system,
  createdAt: r.created_at,
  readAt: r.read_at,
})

export const toInvoice = (r: Row): Invoice => ({
  id: r.id,
  number: r.number,
  orgId: r.org_id,
  bookingId: r.booking_id,
  issuedAt: r.issued_at,
  dueDate: r.due_date,
  amountCents: r.amount_cents,
  gstCents: r.gst_cents,
  status: r.status,
  lines: r.lines ?? [],
})

export const toPaymentMethod = (r: Row): PaymentMethod => ({
  id: r.id,
  orgId: r.org_id,
  brand: r.brand,
  last4: r.last4,
  expMonth: r.exp_month,
  expYear: r.exp_year,
  isDefault: r.is_default,
})

export const toPayout = (r: Row): Payout => ({
  id: r.id,
  orgId: r.org_id,
  amountCents: r.amount_cents,
  status: r.status,
  requestedAt: r.requested_at,
  paidAt: r.paid_at,
})

export const toNotification = (r: Row): AppNotification => ({
  id: r.id,
  profileId: r.profile_id,
  type: r.type,
  title: r.title,
  body: r.body,
  detail: r.detail,
  link: r.link,
  read: r.read,
  createdAt: r.created_at,
})

export const toTicket = (r: Row): SupportTicket => ({
  id: r.id,
  ref: r.ref,
  orgId: r.org_id,
  subject: r.subject,
  category: r.category,
  description: r.description,
  status: r.status,
  createdAt: r.created_at,
})

export const toActivity = (r: Row): AdminActivity => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  detail: r.detail,
  createdAt: r.created_at,
})
