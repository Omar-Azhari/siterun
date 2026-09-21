// Runs once inside the Android/iOS app: status bar, splash screen, keyboard, the
// Android back button, deep links (OAuth and email links) and push registration.
import { getApi } from '@/data/client'
import { safeNextPath } from '@/lib/safePath'
import { APP_SCHEME, nativePlatform } from './platform'

/** Client-side navigation that React Router picks up. */
function go(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export async function initNative() {
  const [{ App }, { StatusBar, Style }, { SplashScreen }, { Keyboard }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/keyboard'),
  ])

  // Light icons on the navy app background.
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  if (nativePlatform() === 'android')
    await StatusBar.setBackgroundColor({ color: '#0B1F44' }).catch(() => {})
  await Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => {})

  // Back button: close an open sheet or drawer first, then go back, then leave the app.
  void App.addListener('backButton', ({ canGoBack }) => {
    if (document.querySelector('[role="dialog"]')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      return
    }
    if (canGoBack && window.location.pathname !== '/welcome') window.history.back()
    else void App.exitApp()
  })

  // au.com.siterun.app://verify?email=… , ://reset-password#access_token=… , ://login?code=…
  void App.addListener('appUrlOpen', async ({ url }) => {
    if (!url.startsWith(`${APP_SCHEME}://`)) return
    const rest = url.slice(`${APP_SCHEME}://`.length)
    const path = '/' + rest.split(/[?#]/)[0]
    const query = rest.includes('?') ? '?' + (rest.split('?')[1] ?? '').split('#')[0] : ''
    try {
      await getApi().completeAuthRedirect(url)
    } catch {
      // Not an auth link, or it expired: the target screen shows the right state.
    }
    const { Browser } = await import('@capacitor/browser')
    await Browser.close().catch(() => {})
    go(path === '/' || path === '/login' ? '/' : path + query)
  })

  window.setTimeout(() => void SplashScreen.hide({ fadeOutDuration: 250 }), 300)

  if (import.meta.env.VITE_PUSH_ENABLED === 'true') void registerPush()
}

/**
 * Push needs Firebase (google-services.json) on Android and APNs on iOS, so it's off
 * unless VITE_PUSH_ENABLED=true. See MOBILE_BUILD.md.
 */
async function registerPush() {
  const { PushNotifications } = await import('@capacitor/push-notifications')
  const perm = await PushNotifications.requestPermissions()
  if (perm.receive !== 'granted') return
  void PushNotifications.addListener('registration', ({ value }) => {
    void getApi()
      .savePushToken(value, nativePlatform())
      .catch(() => {})
  })
  void PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const link = safeNextPath((notification.data as { link?: string } | undefined)?.link)
    if (link) go(link)
  })
  await PushNotifications.register()
}
