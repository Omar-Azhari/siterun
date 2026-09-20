// Cheap platform checks that don't pull Capacitor into the web bundle: the native
// shell injects window.Capacitor before the app loads.
type CapacitorGlobal = { isNativePlatform?: () => boolean; getPlatform?: () => string }
const cap = () => (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor

// Read once at startup: @capacitor/core replaces window.Capacitor with its own
// instance when a plugin loads, and on the web that instance reports "not native".
const NATIVE = !!cap()?.isNativePlatform?.()
const PLATFORM = (cap()?.getPlatform?.() ?? 'web') as 'ios' | 'android' | 'web'

/** True inside the Android or iOS app. */
export const isNative = () => NATIVE

export const nativePlatform = () => PLATFORM

/** Custom URL scheme for OAuth and email links back into the app. */
export const APP_SCHEME = 'au.com.siterun.app'

/** Where auth emails and OAuth send the user back to: the app on native, the site on web. */
export const authRedirect = (path: string) =>
  isNative()
    ? `${APP_SCHEME}://${path.replace(/^\//, '')}`
    : `${window.location.origin}/${path.replace(/^\//, '')}`
