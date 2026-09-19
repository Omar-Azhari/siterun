import type { Api } from './api'
import type { DemoApi } from './demo/demoApi'

/**
 * The app talks to one Api. With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set it
 * uses Supabase; otherwise (or with VITE_BACKEND=demo, used by the screen tests) it
 * runs on the in-browser demo store. Each backend is its own chunk, so a Supabase
 * build never downloads the demo dataset.
 */
const useSupabase =
  import.meta.env.VITE_BACKEND !== 'demo' &&
  !!import.meta.env.VITE_SUPABASE_URL &&
  !!import.meta.env.VITE_SUPABASE_ANON_KEY
const MODE: Api['mode'] = useSupabase ? 'supabase' : 'demo'

let current: Api | null = null
let loading: Promise<Api> | null = null

export function initApi(): Promise<Api> {
  loading ??= (async () => {
    if (useSupabase) {
      const { SupabaseApi } = await import('./supabase/supabaseApi')
      current = new SupabaseApi(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      )
    } else {
      const { DemoApi } = await import('./demo/demoApi')
      current = new DemoApi()
    }
    return current
  })()
  return loading
}

/** Methods that return an unsubscribe function rather than a promise. */
const SUBSCRIPTIONS = new Set([
  'onAuthChange',
  'subscribeDelivery',
  'subscribeMessages',
  'subscribeNotifications',
  'on',
])

/**
 * Stands in for the backend while its chunk downloads, so the first screen can paint
 * straight away. Calls wait for the real Api; subscriptions attach once it's ready.
 */
const deferred = new Proxy({} as Api, {
  get(_, prop: string) {
    if (current) return Reflect.get(current, prop, current)
    if (prop === 'mode') return MODE
    if (prop === 'then') return undefined
    if (SUBSCRIPTIONS.has(prop)) {
      return (...args: unknown[]) => {
        let off: (() => void) | undefined
        let closed = false
        void initApi().then((api) => {
          const fn = Reflect.get(api, prop) as (...a: unknown[]) => () => void
          if (!closed) off = fn.apply(api, args)
        })
        return () => {
          closed = true
          off?.()
        }
      }
    }
    return (...args: unknown[]) =>
      initApi().then((api) =>
        (Reflect.get(api, prop) as (...a: unknown[]) => unknown).apply(api, args),
      )
  },
})

export function getApi(): Api {
  return current ?? deferred
}

export function setApi(next: Api) {
  current = next
}

export function isDemo(api: Api | null = getApi()): api is DemoApi {
  return api?.mode === 'demo'
}

/** Demo logins are listed on the login screen in demo mode, or when explicitly enabled. */
export const showDemoLogins = () => isDemo() || import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true'
