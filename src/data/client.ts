import type { Api } from './api'
import { DemoApi } from './demo/demoApi'

/**
 * The app talks to one Api. Without Supabase env vars it runs on the in-browser
 * demo store; `setApi` lets the Supabase backend replace it at startup.
 */
let current: Api = new DemoApi()

export function getApi(): Api {
  return current
}

export function setApi(next: Api) {
  current = next
}

export function isDemo(api: Api = current): api is DemoApi {
  return api.mode === 'demo'
}
