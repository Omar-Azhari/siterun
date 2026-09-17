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
        <Route element={<RequireArea area={['contractor']} />}>
          <Route path="/home" element={<Navigate to="/browse" replace />} />
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
