import type { SwapOptionId } from '@/lib/booking'
import type {
  AccountType,
  AdminActivity,
  AdminStats,
  AppNotification,
  BillingPeriod,
  BookingView,
  CollectionRequest,
  ComplianceDocument,
  ComplianceRequirement,
  Conversation,
  Delivery,
  DeliveryMethod,
  HireType,
  Invitation,
  Invoice,
  Machine,
  MachineCategory,
  Me,
  MemberRole,
  Message,
  OrgMember,
  Organisation,
  PaymentMethod,
  PerformanceSummary,
  Payout,
  PayoutSummary,
  PlanId,
  Profile,
  SearchFilters,
  SearchResult,
  Site,
  Subscription,
  SupportTicket,
} from './types'

export interface SignUpInput {
  fullName: string
  email: string
  phone: string
  password: string
  accountType: AccountType
}

export interface BusinessProfileInput {
  companyName: string
  abn: string
  contactName: string
  email: string
  phone: string
  address: string
}

export type SiteInput = Omit<Site, 'id' | 'orgId' | 'photoUrl' | 'teamCount'>

export interface BookingInput {
  machineId: string
  startDate: string
  endDate: string
  quantity: number
  hireType: HireType
  delivery: DeliveryMethod
  insurance: boolean
  siteId: string | null
  message?: string
}

export interface CardInput {
  brand: PaymentMethod['brand']
  last4: string
  expMonth: number
  expYear: number
}

export interface DocumentUploadInput {
  requirementId: string
  machineId: string | null
  profileId: string | null
  file: File
  expiryDate: string | null
  notes: string
}

export type MachineDraft = Partial<Omit<Machine, 'id' | 'supplierOrgId' | 'status'>>

export type Unsubscribe = () => void

export type TimeRange = '7d' | '30d' | '90d' | '1y'

/** Everything the UI can ask the backend. Implemented by the demo store and Supabase. */
export interface Api {
  readonly mode: 'demo' | 'supabase'

  // Auth
  getSessionProfileId(): Promise<string | null>
  onAuthChange(cb: (profileId: string | null) => void): Unsubscribe
  signIn(email: string, password: string, remember: boolean): Promise<void>
  signInWithProvider(provider: 'google' | 'apple'): Promise<void>
  signUp(input: SignUpInput): Promise<void>
  verifyOtp(email: string, code: string): Promise<void>
  resendOtp(email: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>

  // Me / account
  getMe(): Promise<Me | null>
  completeBusinessProfile(input: BusinessProfileInput): Promise<Organisation>
  updateProfile(patch: Partial<Pick<Profile, 'fullName' | 'phone'>>): Promise<Profile>
  updateOrganisation(patch: Partial<Omit<Organisation, 'id' | 'kind'>>): Promise<Organisation>

  // Sites & team
  listSites(): Promise<(Site & { activeHires: number })[]>
  getSite(id: string): Promise<Site | null>
  createSite(input: SiteInput): Promise<Site>
  updateSite(id: string, patch: Partial<SiteInput>): Promise<Site>
  listMembers(): Promise<OrgMember[]>
  listInvitations(): Promise<Invitation[]>
  inviteMembers(invites: { email: string; role: MemberRole }[]): Promise<Invitation[]>
  updateMemberRole(memberId: string, role: MemberRole): Promise<void>

  // Plans & credits
  getSubscription(): Promise<Subscription | null>
  subscribe(plan: PlanId, period: BillingPeriod, creditsPack: number | null): Promise<Subscription>

  // Catalogue & search
  listCategories(): Promise<MachineCategory[]>
  searchMachines(filters: SearchFilters): Promise<SearchResult>
  getMachine(id: string): Promise<Machine | null>

  // Contractor bookings & hires
  createBooking(input: BookingInput): Promise<BookingView>
  getBooking(id: string): Promise<BookingView | null>
  listMyBookings(): Promise<BookingView[]>
  listActiveHires(): Promise<BookingView[]>
  extendHire(id: string, newEndDate: string): Promise<BookingView>
  scheduleReturn(id: string, request: CollectionRequest): Promise<BookingView>
  smartSwap(id: string, option: SwapOptionId): Promise<BookingView>
  cancelBooking(id: string): Promise<BookingView>
  getDelivery(bookingId: string): Promise<Delivery | null>
  subscribeDelivery(bookingId: string, cb: (d: Delivery) => void): Unsubscribe

  // Messaging
  listConversations(): Promise<Conversation[]>
  getConversation(id: string): Promise<Conversation | null>
  listMessages(conversationId: string): Promise<Message[]>
  sendMessage(conversationId: string, body: string, attachment?: File | null): Promise<Message>
  markConversationRead(conversationId: string): Promise<void>
  subscribeMessages(conversationId: string, cb: (m: Message) => void): Unsubscribe
  openConversationForBooking(bookingId: string): Promise<string>

  // Payments
  getAccountBalance(): Promise<number>
  listPaymentMethods(): Promise<PaymentMethod[]>
  addPaymentMethod(card: CardInput): Promise<PaymentMethod>
  removePaymentMethod(id: string): Promise<void>
  makePayment(amountCents: number, methodId: string): Promise<void>
  listInvoices(): Promise<Invoice[]>
  getInvoice(id: string): Promise<Invoice | null>

  // Notifications
  listNotifications(): Promise<AppNotification[]>
  markNotificationRead(id: string): Promise<void>
  markAllNotificationsRead(): Promise<void>
  subscribeNotifications(cb: () => void): Unsubscribe

  // Supplier: listings
  listMyMachines(): Promise<Machine[]>
  createMachineDraft(categoryId: string): Promise<Machine>
  saveMachineDraft(id: string, patch: MachineDraft): Promise<Machine>
  uploadMachinePhoto(id: string, file: File): Promise<string>
  submitMachine(id: string): Promise<Machine>
  setMachinePaused(id: string, paused: boolean): Promise<Machine>

  // Supplier: compliance
  listRequirements(): Promise<ComplianceRequirement[]>
  listDocuments(filter: { machineId?: string; profileId?: string }): Promise<ComplianceDocument[]>
  listOrgDocuments(): Promise<ComplianceDocument[]>
  uploadDocument(input: DocumentUploadInput): Promise<ComplianceDocument>
  getDocumentUrl(id: string): Promise<string | null>

  // Supplier: bookings & money
  listSupplierBookings(): Promise<BookingView[]>
  respondToBooking(id: string, accept: boolean, reason?: string): Promise<BookingView>
  /** Supplier lifecycle: confirmed → in_transit → on_site → completed (completion raises the invoice). */
  advanceBooking(id: string, to: 'in_transit' | 'on_site' | 'completed'): Promise<BookingView>
  getPayoutSummary(): Promise<PayoutSummary>
  listPayouts(): Promise<Payout[]>
  requestPayout(): Promise<Payout>
  getPerformance(range: '30d' | '90d' | '1y'): Promise<PerformanceSummary>

  // Operator
  listOperatorBookings(): Promise<BookingView[]>

  // Support
  listTickets(): Promise<SupportTicket[]>
  createTicket(input: {
    subject: string
    category: string
    description: string
  }): Promise<SupportTicket>

  // Platform admin
  getAdminStats(range: TimeRange): Promise<AdminStats>
  listAdminActivity(): Promise<AdminActivity[]>
  listPendingMachines(): Promise<Machine[]>
  listPendingDocuments(): Promise<
    (ComplianceDocument & { orgName: string; machineTitle: string | null })[]
  >
  reviewMachine(id: string, approve: boolean, reason?: string): Promise<Machine>
  reviewDocument(id: string, approve: boolean, reason?: string): Promise<ComplianceDocument>
  listSupplierOrgs(): Promise<(Organisation & { machineCount: number; liveCount: number })[]>
  listAllBookings(): Promise<BookingView[]>
}

export class ApiError extends Error {
  constructor(
    message: string,
    public code:
      | 'unauthenticated'
      | 'forbidden'
      | 'not_found'
      | 'invalid'
      | 'conflict'
      | 'unknown' = 'unknown',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}
