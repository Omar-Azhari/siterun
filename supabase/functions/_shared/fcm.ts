// Firebase Cloud Messaging (HTTP v1) pieces for the push function. Uses only Web APIs
// (fetch, WebCrypto), so it runs in Deno and is testable with Vitest.

export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

export interface PushPayload {
  title: string
  body: string | null
  link: string | null
  tokens: { token: string; platform: string }[]
}

/** One FCM message. Android shows the notification itself; iOS gets it through APNs. */
export function buildMessage(token: string, p: PushPayload) {
  return {
    message: {
      token,
      notification: { title: p.title, ...(p.body ? { body: p.body } : {}) },
      // The app opens this screen when the notification is tapped (native/bootstrap.ts).
      // Only a path inside the app; "//host" would point at another site.
      data: p.link && /^\/(?![/\\])/.test(p.link) ? { link: p.link } : {},
      android: { priority: 'HIGH' },
      apns: { payload: { aps: { sound: 'default' } } },
    },
  }
}

/** FCM's way of saying a token will never work again (app uninstalled, token replaced). */
export function isDeadToken(status: number, body: unknown): boolean {
  if (status === 404) return true
  const err = (body as { error?: { status?: string; details?: { errorCode?: string }[] } })?.error
  const codes = [err?.status, ...(err?.details ?? []).map((d) => d.errorCode)]
  return (
    codes.includes('UNREGISTERED') ||
    (status === 400 &&
      codes.includes('INVALID_ARGUMENT') &&
      JSON.stringify(body).includes('registration token'))
  )
}

const b64url = (bytes: Uint8Array | string) => {
  const s = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function signJwt(sa: ServiceAccount, now: number): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  )
  return `${header}.${claims}.${b64url(new Uint8Array(sig))}`
}

let cached: { token: string; expires: number } | null = null

/** A Google OAuth access token for FCM, reused until five minutes before it expires. */
export async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cached && cached.expires - 300 > now) return cached.token
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await signJwt(sa, now),
    }),
  })
  if (!res.ok) throw new Error(`Google token request failed (${res.status})`)
  const data = (await res.json()) as { access_token: string; expires_in: number }
  cached = { token: data.access_token, expires: now + data.expires_in }
  return data.access_token
}
