import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { FullPageSpinner, PublicOnly, RequireArea, RequireAuth } from '@/auth/guards'
import { homePathFor, needsOnboarding } from '@/auth/roles'
import { useMe } from '@/data/hooks'
import { NotFoundPage } from '@/pages/NotFoundPage'

const page = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] as React.ComponentType }))

// Board 01
const WelcomePage = page(() => import('@/pages/auth/WelcomePage'), 'WelcomePage')
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
const CreateSiteLocationPage = page(() => import('@/pages/sites/CreateSiteLocationPage'), 'CreateSiteLocationPage')
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
const SearchResultsPage = page(() => import('@/pages/browse/SearchResultsPage'), 'SearchResultsPage')
const MachineDetailPage = page(() => import('@/pages/browse/MachineDetailPage'), 'MachineDetailPage')
const BookPage = page(() => import('@/pages/browse/BookPage'), 'BookPage')
const BookingConfirmedPage = page(() => import('@/pages/bookings/BookingConfirmedPage'), 'BookingConfirmedPage')
const BookingDetailPage = page(() => import('@/pages/bookings/BookingDetailPage'), 'BookingDetailPage')

// Board 04
const ActiveHiresPage = page(() => import('@/pages/hires/ActiveHiresPage'), 'ActiveHiresPage')
const HireDetailPage = page(() => import('@/pages/hires/HireDetailPage'), 'HireDetailPage')
const TrackingPage = page(() => import('@/pages/hires/TrackingPage'), 'TrackingPage')
const ExtendHirePage = page(() => import('@/pages/hires/ExtendHirePage'), 'ExtendHirePage')
const ReturnPage = page(() => import('@/pages/hires/ReturnPage'), 'ReturnPage')
const SmartSwapPage = page(() => import('@/pages/hires/SmartSwapPage'), 'SmartSwapPage')

// Board 05
const BookingsCalendarPage = page(() => import('@/pages/bookings/BookingsCalendarPage'), 'BookingsCalendarPage')
const ConversationsPage = page(() => import('@/pages/messages/ConversationsPage'), 'ConversationsPage')
const ChatPage = page(() => import('@/pages/messages/ChatPage'), 'ChatPage')
const PaymentsPage = page(() => import('@/pages/payments/PaymentsPage'), 'PaymentsPage')
const AddCardPage = page(() => import('@/pages/payments/AddCardPage'), 'AddCardPage')
const InvoicesPage = page(() => import('@/pages/payments/InvoicesPage'), 'InvoicesPage')
const NotificationsPage = page(() => import('@/pages/notifications/NotificationsPage'), 'NotificationsPage')
const AccountPage = page(() => import('@/pages/account/AccountPage'), 'AccountPage')
const ProfilePage = page(() => import('@/pages/account/AccountSubPages'), 'ProfilePage')
const CompanyPage = page(() => import('@/pages/account/AccountSubPages'), 'CompanyPage')
const PaymentSettingsPage = page(() => import('@/pages/account/AccountSubPages'), 'PaymentSettingsPage')
const AccountPrivacyPage = page(() => import('@/pages/account/AccountSubPages'), 'PrivacyPage')

// Dev
const BrandPage = page(() => import('@/pages/dev/BrandPage'), 'BrandPage')
const ComponentsPage = page(() => import('@/pages/dev/ComponentsPage'), 'ComponentsPage')
const DevScreensPage = page(() => import('@/pages/dev/DevScreensPage'), 'DevScreensPage')

function RootRedirect() {
  const me = useMe()
  if (me.isPending) return <FullPageSpinner />
  if (!me.data) return <Navigate to="/welcome" replace />
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

      {import.meta.env.DEV && (
        <>
          <Route path="/dev/brand" element={<BrandPage />} />
          <Route path="/dev/components" element={<ComponentsPage />} />
          <Route path="/dev/screens" element={<DevScreensPage />} />
        </>
      )}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
