import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner, PublicOnly, RequireArea, RequireAuth } from '@/auth/guards'
import { homePathFor, needsOnboarding } from '@/auth/roles'
import { isNative } from '@/native/platform'

// Dev-only pages: the conditional import is a build-time constant, so production
// builds contain no /dev route and none of that code.
const DevRoutes = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/DevRoutes').then((m) => ({ default: m.DevRoutes })))
  : null
import { useMe } from '@/data/hooks'
import { NotFoundPage } from '@/pages/NotFoundPage'

const page = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] as React.ComponentType }))

// Board 01
const WelcomePage = page(() => import('@/pages/auth/WelcomePage'), 'WelcomePage')
const LandingPage = page(() => import('@/pages/marketing/LandingPage'), 'LandingPage')
const ChooseRolePage = page(() => import('@/pages/auth/ChooseRolePage'), 'ChooseRolePage')
const SignUpPage = page(() => import('@/pages/auth/SignUpPage'), 'SignUpPage')
const LoginPage = page(() => import('@/pages/auth/LoginPage'), 'LoginPage')
const VerifyPage = page(() => import('@/pages/auth/VerifyPage'), 'VerifyPage')
const BusinessProfilePage = page(
  () => import('@/pages/auth/BusinessProfilePage'),
  'BusinessProfilePage',
)
const ForgotPasswordPage = page(() => import('@/pages/auth/PasswordPages'), 'ForgotPasswordPage')
const ResetPasswordPage = page(() => import('@/pages/auth/PasswordPages'), 'ResetPasswordPage')
const TermsPage = lazy(async () => {
  const { LegalPage } = await import('@/pages/LegalPage')
  return { default: () => <LegalPage kind="terms" /> }
})
const PrivacyPage = lazy(async () => {
  const { LegalPage } = await import('@/pages/LegalPage')
  return { default: () => <LegalPage kind="privacy" /> }
})

// Board 02
const CreateSiteLocationPage = page(
  () => import('@/pages/sites/CreateSiteLocationPage'),
  'CreateSiteLocationPage',
)
const SiteDetailsPage = page(() => import('@/pages/sites/SiteDetailsPage'), 'SiteDetailsPage')
const SiteAccessPage = page(() => import('@/pages/sites/SiteAccessPage'), 'SiteAccessPage')
const SitesPage = page(() => import('@/pages/sites/SitesPage'), 'SitesPage')
const SiteDetailPage = page(() => import('@/pages/sites/SiteDetailPage'), 'SiteDetailPage')
const SiteEditPage = page(() => import('@/pages/sites/SiteDetailPage'), 'SiteEditPage')
const InviteTeamPage = page(() => import('@/pages/team/InviteTeamPage'), 'InviteTeamPage')
const TeamPage = page(() => import('@/pages/team/TeamPage'), 'TeamPage')
const PlansPage = page(() => import('@/pages/plans/PlansPage'), 'PlansPage')

// Board 03
const BrowsePage = page(() => import('@/pages/browse/BrowsePage'), 'BrowsePage')
const SearchPage = page(() => import('@/pages/browse/SearchPage'), 'SearchPage')
const SearchResultsPage = page(
  () => import('@/pages/browse/SearchResultsPage'),
  'SearchResultsPage',
)
const MachineDetailPage = page(
  () => import('@/pages/browse/MachineDetailPage'),
  'MachineDetailPage',
)
const BookPage = page(() => import('@/pages/browse/BookPage'), 'BookPage')
const BookingConfirmedPage = page(
  () => import('@/pages/bookings/BookingConfirmedPage'),
  'BookingConfirmedPage',
)
const BookingDetailPage = page(
  () => import('@/pages/bookings/BookingDetailPage'),
  'BookingDetailPage',
)

// Board 04
const ActiveHiresPage = page(() => import('@/pages/hires/ActiveHiresPage'), 'ActiveHiresPage')
const HireDetailPage = page(() => import('@/pages/hires/HireDetailPage'), 'HireDetailPage')
const TrackingPage = page(() => import('@/pages/hires/TrackingPage'), 'TrackingPage')
const ExtendHirePage = page(() => import('@/pages/hires/ExtendHirePage'), 'ExtendHirePage')
const ReturnPage = page(() => import('@/pages/hires/ReturnPage'), 'ReturnPage')
const SmartSwapPage = page(() => import('@/pages/hires/SmartSwapPage'), 'SmartSwapPage')

// Board 05
const BookingsCalendarPage = page(
  () => import('@/pages/bookings/BookingsCalendarPage'),
  'BookingsCalendarPage',
)
const ConversationsPage = page(
  () => import('@/pages/messages/ConversationsPage'),
  'ConversationsPage',
)
const ChatPage = page(() => import('@/pages/messages/ChatPage'), 'ChatPage')
const PaymentsPage = page(() => import('@/pages/payments/PaymentsPage'), 'PaymentsPage')
const AddCardPage = page(() => import('@/pages/payments/AddCardPage'), 'AddCardPage')
const InvoicesPage = page(() => import('@/pages/payments/InvoicesPage'), 'InvoicesPage')
const NotificationsPage = page(
  () => import('@/pages/notifications/NotificationsPage'),
  'NotificationsPage',
)
const AccountPage = page(() => import('@/pages/account/AccountPage'), 'AccountPage')
const ProfilePage = page(() => import('@/pages/account/AccountSubPages'), 'ProfilePage')
const CompanyPage = page(() => import('@/pages/account/AccountSubPages'), 'CompanyPage')
const PaymentSettingsPage = page(
  () => import('@/pages/account/AccountSubPages'),
  'PaymentSettingsPage',
)
const AccountPrivacyPage = page(() => import('@/pages/account/AccountSubPages'), 'PrivacyPage')

// Boards 07-10 (supplier)
const SupplierMachinesPage = page(() => import('@/pages/supplier/MachinesPage'), 'MachinesPage')
const MachineManagePage = page(() => import('@/pages/supplier/MachinesPage'), 'MachineManagePage')
const CategoryStep = page(() => import('@/pages/supplier/listing/CategoryStep'), 'CategoryStep')
const DetailsStep = page(() => import('@/pages/supplier/listing/DetailsStep'), 'DetailsStep')
const PhotosStep = page(() => import('@/pages/supplier/listing/PhotosStep'), 'PhotosStep')
const SpecsStep = page(() => import('@/pages/supplier/listing/SpecsStep'), 'SpecsStep')
const RatesStep = page(() => import('@/pages/supplier/listing/RatesStep'), 'RatesStep')
const ServiceAreaStep = page(
  () => import('@/pages/supplier/listing/ServiceAreaStep'),
  'ServiceAreaStep',
)
const PreviewListingPage = page(
  () => import('@/pages/supplier/listing/ListingReviewPages'),
  'PreviewListingPage',
)
const ReviewSubmitPage = page(
  () => import('@/pages/supplier/listing/ListingReviewPages'),
  'ReviewSubmitPage',
)
const ListingLivePage = page(
  () => import('@/pages/supplier/listing/ListingReviewPages'),
  'ListingLivePage',
)
const ComplianceChecklistPage = page(
  () => import('@/pages/supplier/compliance/ComplianceChecklistPage'),
  'ComplianceChecklistPage',
)
const RequirementsPage = page(
  () => import('@/pages/supplier/compliance/RequirementsPage'),
  'RequirementsPage',
)
const UploadDocumentPage = page(
  () => import('@/pages/supplier/compliance/UploadDocumentPage'),
  'UploadDocumentPage',
)
const ComplianceStatusPage = page(
  () => import('@/pages/supplier/compliance/ComplianceStatusPage'),
  'ComplianceStatusPage',
)
const ComplianceAlertsPage = page(
  () => import('@/pages/supplier/compliance/ComplianceAlertsPage'),
  'ComplianceAlertsPage',
)
const BookingRequestsPage = page(
  () => import('@/pages/supplier/bookings/SupplierBookingsPages'),
  'BookingRequestsPage',
)
const DispatchPage = page(
  () => import('@/pages/supplier/bookings/SupplierBookingsPages'),
  'DispatchPage',
)
const SupplierBookingsListPage = page(
  () => import('@/pages/supplier/bookings/SupplierBookingsPages'),
  'SupplierBookingsListPage',
)
const SupplierBookingDetailPage = page(
  () => import('@/pages/supplier/bookings/SupplierBookingsPages'),
  'SupplierBookingDetailPage',
)
const PayoutsPage = page(() => import('@/pages/supplier/PayoutsPage'), 'PayoutsPage')
const PerformancePage = page(() => import('@/pages/supplier/PerformancePage'), 'PerformancePage')

// Support
const SupportPage = page(() => import('@/pages/support/SupportPages'), 'SupportPage')
const TicketsPage = page(() => import('@/pages/support/SupportPages'), 'TicketsPage')
const HelpArticlesPage = page(() => import('@/pages/support/SupportPages'), 'HelpArticlesPage')
const NewTicketPage = page(() => import('@/pages/support/SupportPages'), 'NewTicketPage')

// Platform admin
const AdminDashboardPage = page(() => import('@/pages/admin/AdminPages'), 'AdminDashboardPage')
const AdminApprovalsPage = page(() => import('@/pages/admin/AdminPages'), 'AdminApprovalsPage')
const AdminMachineReviewPage = page(
  () => import('@/pages/admin/AdminPages'),
  'AdminMachineReviewPage',
)
const AdminDocumentReviewPage = page(
  () => import('@/pages/admin/AdminPages'),
  'AdminDocumentReviewPage',
)
const AdminSuppliersPage = page(() => import('@/pages/admin/AdminPages'), 'AdminSuppliersPage')
const AdminBookingsPage = page(() => import('@/pages/admin/AdminPages'), 'AdminBookingsPage')
const AdminMorePage = page(() => import('@/pages/admin/AdminPages'), 'AdminMorePage')

// Operator
const OperatorHomePage = page(() => import('@/pages/operator/OperatorPages'), 'OperatorHomePage')
const OperatorBookingsPage = page(
  () => import('@/pages/operator/OperatorPages'),
  'OperatorBookingsPage',
)
const OperatorBookingDetailPage = page(
  () => import('@/pages/operator/OperatorPages'),
  'OperatorBookingDetailPage',
)
const OperatorDocumentsPage = page(
  () => import('@/pages/operator/OperatorPages'),
  'OperatorDocumentsPage',
)

// Dev

function RootRedirect() {
  const me = useMe()
  if (me.isPending) return <FullPageSpinner />
  if (!me.data) return isNative() ? <Navigate to="/welcome" replace /> : <LandingPage />
  return (
    <Navigate
      to={needsOnboarding(me.data) ? '/onboarding/business' : homePathFor(me.data)}
      replace
    />
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/verify" element={<VerifyPage />} />

      <Route element={<PublicOnly />}>
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/signup/role" element={<ChooseRolePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/onboarding/business" element={<BusinessProfilePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {/* Shared by signed-in roles */}
        <Route path="/machines/:id" element={<MachineDetailPage />} />
        <Route path="/messages" element={<ConversationsPage />} />
        <Route path="/messages/:id" element={<ChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/profile" element={<ProfilePage />} />
        <Route path="/account/company" element={<CompanyPage />} />
        <Route path="/account/payment-settings" element={<PaymentSettingsPage />} />
        <Route path="/account/privacy" element={<AccountPrivacyPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/support/requests" element={<TicketsPage />} />
        <Route path="/support/articles" element={<HelpArticlesPage />} />
        <Route path="/support/new" element={<NewTicketPage />} />

        <Route element={<RequireArea area={['supplier', 'operator']} />}>
          <Route path="/supplier/compliance/upload" element={<UploadDocumentPage />} />
        </Route>

        <Route element={<RequireArea area="supplier" />}>
          <Route path="/supplier" element={<PerformancePage />} />
          <Route path="/supplier/performance" element={<PerformancePage />} />
          <Route path="/supplier/machines" element={<SupplierMachinesPage />} />
          <Route path="/supplier/machines/new/category" element={<CategoryStep />} />
          <Route path="/supplier/machines/:id" element={<MachineManagePage />} />
          <Route path="/supplier/machines/:id/edit/category" element={<CategoryStep />} />
          <Route path="/supplier/machines/:id/edit/details" element={<DetailsStep />} />
          <Route path="/supplier/machines/:id/edit/photos" element={<PhotosStep />} />
          <Route path="/supplier/machines/:id/edit/specs" element={<SpecsStep />} />
          <Route path="/supplier/machines/:id/edit/rates" element={<RatesStep />} />
          <Route path="/supplier/machines/:id/edit/service-area" element={<ServiceAreaStep />} />
          <Route path="/supplier/machines/:id/compliance" element={<ComplianceStatusPage />} />
          <Route path="/supplier/machines/:id/preview" element={<PreviewListingPage />} />
          <Route path="/supplier/machines/:id/review" element={<ReviewSubmitPage />} />
          <Route path="/supplier/machines/:id/live" element={<ListingLivePage />} />
          <Route path="/supplier/compliance" element={<ComplianceChecklistPage />} />
          <Route path="/supplier/compliance/requirements/:group" element={<RequirementsPage />} />
          <Route path="/supplier/compliance/alerts" element={<ComplianceAlertsPage />} />
          <Route path="/supplier/requests" element={<BookingRequestsPage />} />
          <Route path="/supplier/dispatch" element={<DispatchPage />} />
          <Route path="/supplier/bookings" element={<SupplierBookingsListPage />} />
          <Route path="/supplier/bookings/:id" element={<SupplierBookingDetailPage />} />
          <Route path="/supplier/payouts" element={<PayoutsPage />} />
        </Route>

        <Route element={<RequireArea area="operator" />}>
          <Route path="/operator" element={<OperatorHomePage />} />
          <Route path="/operator/bookings" element={<OperatorBookingsPage />} />
          <Route path="/operator/bookings/:id" element={<OperatorBookingDetailPage />} />
          <Route path="/operator/documents" element={<OperatorDocumentsPage />} />
        </Route>

        <Route element={<RequireArea area="admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
          <Route path="/admin/approvals/machines/:id" element={<AdminMachineReviewPage />} />
          <Route path="/admin/approvals/documents/:id" element={<AdminDocumentReviewPage />} />
          <Route path="/admin/suppliers" element={<AdminSuppliersPage />} />
          <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          <Route path="/admin/more" element={<AdminMorePage />} />
        </Route>

        <Route element={<RequireArea area={['contractor']} />}>
          <Route path="/home" element={<BrowsePage />} />
          <Route path="/browse" element={<BrowsePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/search/results" element={<SearchResultsPage />} />
          <Route path="/machines/:id/book" element={<BookPage />} />
          <Route path="/bookings/:id/confirmed" element={<BookingConfirmedPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="/sites/new/location" element={<CreateSiteLocationPage />} />
          <Route path="/sites/new/details" element={<SiteDetailsPage />} />
          <Route path="/sites/new/access" element={<SiteAccessPage />} />
          <Route path="/sites/:id" element={<SiteDetailPage />} />
          <Route path="/sites/:id/edit" element={<SiteEditPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/team/invite" element={<InviteTeamPage />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/hires" element={<ActiveHiresPage />} />
          <Route path="/hires/:id" element={<HireDetailPage />} />
          <Route path="/hires/:id/tracking" element={<TrackingPage />} />
          <Route path="/hires/:id/extend" element={<ExtendHirePage />} />
          <Route path="/hires/:id/return" element={<ReturnPage />} />
          <Route path="/hires/:id/swap" element={<SmartSwapPage />} />
          <Route path="/bookings" element={<BookingsCalendarPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/cards/new" element={<AddCardPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
        </Route>
      </Route>

      {DevRoutes && <Route path="/dev/*" element={<DevRoutes />} />}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
