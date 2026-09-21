// Small HTTP helpers shared by the Edge Functions. No Deno or npm imports, so Vitest can
// test them too.

/** Origins that may call the browser-facing functions, besides ALLOWED_ORIGINS. */
export const DEFAULT_ORIGINS = [
  // The Android and iOS apps (Capacitor).
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
  // Local development and the test builds.
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:4173',
]

/** ALLOWED_ORIGINS is a comma-separated list, e.g. "https://siterun.com.au,https://www.siterun.com.au". */
export function allowedOrigins(env: string | undefined): string[] {
  const extra = (env ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean)
  return [...DEFAULT_ORIGINS, ...extra]
}

/**
 * CORS headers for a response. The origin is echoed back only when it's on the list;
 * anything else gets no Access-Control-Allow-Origin, so the browser refuses to read the
 * response. (CORS is not the security boundary: every request also needs a valid session.)
 */
export function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
  if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  })
}

/** Compares two strings without leaking, through timing, how much of them matched. */
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a)
  const y = new TextEncoder().encode(b)
  let diff = x.length ^ y.length
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}
