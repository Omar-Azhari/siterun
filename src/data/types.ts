// Domain model shared by the demo store and the Supabase backend.
// Money is always integer cents, ex GST. Dates are ISO strings (yyyy-MM-dd for
// calendar dates, full ISO for timestamps).

export type AccountType = 'contractor' | 'supplier' | 'operator' | 'org_admin'
export type OrgKind = 'contractor' | 'supplier'
export type MemberRole = 'owner' | 'project_manager' | 'site_manager' | 'viewer'
export type SiteStatus = 'active' | 'planning' | 'on_hold'
export type MachineStatus = 'draft' | 'pending_review' | 'live' | 'rejected' | 'paused'
export type BookingStatus =
  | 'requested'
  | 'confirmed'
  | 'declined'
  | 'in_transit'
  | 'on_site'
  | 'return_scheduled'
  | 'completed'
  | 'cancelled'
export type DocumentStatus = 'pending' | 'verified' | 'rejected'
export type HireType = 'dry' | 'wet'
export type DeliveryMethod = 'pickup' | 'delivery'
export type PlanId = 'starter' | 'pro' | 'enterprise'
export type BillingPeriod = 'monthly' | 'annual'

export interface Profile {
  id: string
  fullName: string
  email: string
  phone: string
  accountType: AccountType
  isPlatformAdmin: boolean
  avatarUrl: string | null
  orgId: string | null
  emailVerified: boolean
  /** Notification emails, off when the person turns them off. */
  emailNotifications?: boolean
}

export interface Organisation {
  id: string
  kind: OrgKind
  name: string
  abn: string
  contactName: string
  email: string
  phone: string
  address: string
  rating: number | null
  reviewCount: number
  logoUrl: string | null
  createdAt: string
}

export interface OrgMember {
  id: string
  orgId: string
  profileId: string | null
  name: string
  email: string
  role: MemberRole
}

export interface Invitation {
  id: string
  orgId: string
  email: string
  role: MemberRole
  status: 'pending' | 'accepted' | 'revoked'
  createdAt: string
}

export interface Site {
  id: string
  orgId: string
  name: string
  address: string
  suburb: string
  state: string
  postcode: string
  lat: number
  lng: number
  projectType: string
  startDate: string
  durationMonths: number
  status: SiteStatus
  deliveryFrom: string
  deliveryTo: string
  accessNotes: string
  contactName: string
  contactPhone: string
  photoUrl: string | null
  teamCount: number
}

export interface Subscription {
  orgId: string
  plan: PlanId
  period: BillingPeriod
  status: 'active' | 'none'
  creditsBalance: number
  renewsAt: string | null
}

export interface MachineCategory {
  id: string
  slug: string
  name: string
  imageUrl: string
  /** Lucide icon name hint for list views. */
  icon: string
  /** Which compliance requirement groups apply. */
  requirementGroups: ('general' | 'crane')[]
  sortOrder: number
}

export interface MachineRates {
  hourly: number | null
  daily: number
  weekly: number | null
  /** Daily rate with operator (wet hire). */
  wetDaily: number | null
}

export interface Machine {
  id: string
  supplierOrgId: string
  supplierName: string
  supplierRating: number | null
  supplierReviews: number
  categoryId: string
  title: string
  make: string
  model: string
  year: number | null
  serialNumber: string
  registration: string
  assetCode: string
  photos: string[]
  specs: Record<string, string>
  attachments: string[]
  fuelType: string
  features: string[]
  capacityTonnes: number | null
  rates: MachineRates
  hireTypes: HireType[]
  minBooking: string
  availableFrom: string
  suburb: string
  state: string
  lat: number
  lng: number
  serviceRadiusKm: number
  offerDelivery: boolean
  sameDayDelivery: boolean
  thirdPartyTransport: boolean
  status: MachineStatus
  rejectionReason: string | null
  submittedAt: string | null
  approvedAt: string | null
  /** Last wizard step saved (1–6), for resuming drafts. */
  draftStep: number
  createdAt: string
}

export interface ComplianceRequirement {
  id: string
  group: 'general' | 'crane' | 'operator'
  name: string
  description: string
  icon: string
  required: boolean
  sortOrder: number
}

export interface ComplianceDocument {
  id: string
  orgId: string
  machineId: string | null
  /** Operator documents belong to a person. */
  profileId: string | null
  requirementId: string
  fileName: string
  fileSize: number
  fileUrl: string | null
  expiryDate: string | null
  status: DocumentStatus
  notes: string
  rejectionReason: string | null
  uploadedAt: string
}

export interface CollectionRequest {
  date: string
  slot: 'morning' | 'afternoon'
  notes: string
}

export interface Booking {
  id: string
  ref: string
  machineId: string
  contractorOrgId: string
  supplierOrgId: string
  siteId: string | null
  operatorProfileId: string | null
  createdBy: string
  startDate: string
  endDate: string
  quantity: number
  hireType: HireType
  delivery: DeliveryMethod
  insurance: boolean
  dailyRate: number
  totalCents: number
  status: BookingStatus
  customerMessage: string
  declineReason: string | null
  startTime: string
  endTime: string
  collection: CollectionRequest | null
  createdAt: string
}

export type DeliveryStage = 'picked_up' | 'in_transit' | 'arriving' | 'delivered'

export interface Delivery {
  bookingId: string
  stage: DeliveryStage
  origin: { label: string; lat: number; lng: number }
  destination: { label: string; lat: number; lng: number }
  route: [number, number][]
  /** 0–1 along the route. */
  progress: number
  pickedUpAt: string | null
  eta: string
  deliveredAt: string | null
  /** True once the driver's phone is sharing GPS; until then the truck follows the route. */
  live: boolean
  /** Last GPS position, [lat, lng]. */
  position: [number, number] | null
  positionAt: string | null
}

/** Where a supplier's payouts stand with Stripe. */
export interface PayoutAccount {
  /** 'stripe' once real payouts are switched on; 'mock' records them only. */
  provider: 'mock' | 'stripe'
  isOwner: boolean
  connected: boolean
  detailsSubmitted: boolean
  payoutsEnabled: boolean
}

/** A payment an admin can refund. */
export interface RefundablePayment {
  id: string
  amountCents: number
  refundedCents: number
  kind: string
  description: string
  createdAt: string
}

export interface AnalyticsSummary {
  searches: number
  views: number
  bookStarts: number
  bookings: number
  organisations: number
  searchTrend: number
  bookingTrend: number
  /** Percentage of machine views that became bookings. */
  viewToBooking: number
  topSearches: { label: string; count: number }[]
  topCategories: { label: string; count: number }[]
  topMachines: { id: string; label: string; views: number; bookings: number }[]
  daily: { date: string; searches: number; bookings: number }[]
}

/** What the app records about how people use it (analytics_events). */
export type TrackedEvent = 'search' | 'machine_view' | 'book_start' | 'booking'

/** An error report from the website or apps (platform admin view). */
export interface ClientError {
  id: number
  message: string
  stack: string
  url: string
  release: string
  platform: string
  count: number
  firstSeen: string
  lastSeen: string
  signedIn: boolean
}

export interface Conversation {
  id: string
  title: string
  subtitle: string
  bookingId: string | null
  participantOrgIds: string[]
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  online: boolean
  avatarUrl: string | null
}

export interface Message {
  id: string
  conversationId: string
  senderId: string | null
  senderName: string
  body: string
  attachmentName: string | null
  system: boolean
  createdAt: string
  readAt: string | null
}

export interface Invoice {
  id: string
  number: string
  orgId: string
  bookingId: string | null
  issuedAt: string
  dueDate: string
  amountCents: number
  gstCents: number
  status: 'paid' | 'due' | 'overdue'
  lines: { description: string; amountCents: number }[]
}

export interface PaymentMethod {
  id: string
  orgId: string
  brand: 'visa' | 'mastercard' | 'amex'
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
}

export interface Payment {
  id: string
  orgId: string
  amountCents: number
  methodId: string | null
  kind: 'invoice' | 'subscription' | 'credits' | 'balance' | 'refund'
  description: string
  status: 'succeeded' | 'failed'
  /** How much of this payment has been refunded. */
  refundedCents?: number
  createdAt: string
}

export interface CreditTransaction {
  id: string
  orgId: string
  credits: number
  amountCents: number
  description: string
  createdAt: string
}

export interface Payout {
  id: string
  orgId: string
  amountCents: number
  status: 'paid' | 'processing'
  requestedAt: string
  paidAt: string | null
}

export type NotificationType =
  'booking' | 'delivery' | 'invoice' | 'document' | 'message' | 'listing'

export interface AppNotification {
  id: string
  profileId: string
  type: NotificationType
  title: string
  body: string
  detail: string
  link: string | null
  read: boolean
  createdAt: string
}

export interface SupportTicket {
  id: string
  ref: string
  orgId: string
  subject: string
  category: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  createdAt: string
}

export interface Review {
  id: string
  bookingId: string
  supplierOrgId: string
  rating: number
  comment: string
  createdAt: string
}

export interface AdminActivity {
  id: string
  kind:
    | 'supplier_registered'
    | 'machine_approved'
    | 'machine_rejected'
    | 'dispute'
    | 'payout'
    | 'document_verified'
    | 'document_rejected'
    | 'booking_cancelled'
    | 'booking_adjusted'
    | 'refund'
  title: string
  detail: string
  createdAt: string
}

// ---- Composite read models ----------------------------------------------------

export interface BookingView extends Booking {
  machine: Machine
  site: Site | null
  contractor: Organisation
  supplier: Organisation
  contactName: string
  contactPhone: string
  deliveryAddress: string
  days: number
}

export interface Me {
  profile: Profile
  org: Organisation | null
  role: MemberRole | null
}

export interface SearchFilters {
  q?: string
  categorySlug?: string
  location?: string
  lat?: number
  lng?: number
  startDate?: string
  endDate?: string
  minTonnes?: number
  maxTonnes?: number
  minPrice?: number
  maxPrice?: number
  hireType?: HireType
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'rating'
  page?: number
  pageSize?: number
}

export interface SearchResult {
  items: Machine[]
  total: number
  page: number
  pageSize: number
}

export interface PerformanceSummary {
  hires: number
  hiresTrend: number
  utilisation: number
  utilisationTrend: number
  revenueCents: number
  revenueTrend: number
  trend: { label: string; hires: number }[]
  topMachines: { machineId: string; title: string; hires: number; utilisation: number }[]
}

export interface PayoutSummary {
  availableCents: number
  totalRevenueCents: number
  revenueTrend: number
  completedHires: number
  completedTrend: number
}

export interface AdminStats {
  users: number
  usersTrend: number
  suppliers: number
  suppliersTrend: number
  bookings: number
  bookingsTrend: number
  payoutsCents: number
  payoutsTrend: number
  disputes: number
  disputesTrend: number
}
