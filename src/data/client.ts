import type { Api } from './api'
import { DemoApi } from './demo/demoApi'
import { SupabaseApi } from './supabase/supabaseApi'

/**
 * The app talks to one Api. With VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set it
 * uses Supabase; otherwise (or with VITE_BACKEND=demo, used by the screen tests) it
 * runs on the in-browser demo store.
 */
function createApi(): Api {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (import.meta.env.VITE_BACKEND !== 'demo' && url && key) return new SupabaseApi(url, key)
  return new DemoApi()
}

let current: Api = createApi()

export function getApi(): Api {
  return current
}

export function setApi(next: Api) {
  current = next
}

export function isDemo(api: Api = current): api is DemoApi {
  return api.mode === 'demo'
}

/** Demo logins are listed on the login screen in demo mode, or when explicitly enabled. */
export const showDemoLogins = () => isDemo() || import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true'
