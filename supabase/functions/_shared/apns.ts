// Apple Push Notification service, for the iOS app. Capacitor's push plugin gives iPhones
// an APNs device token (not a Firebase one), so iOS notifications go to Apple directly.
// Uses only Web APIs (fetch, WebCrypto), so it runs in Deno and is testable with Vitest.

export interface ApnsConfig {
  /** Contents of the .p8 key file from the Apple Developer portal. */
  key: string
  keyId: string
  teamId: string
  /** App Store and TestFlight builds use production; builds run from Xcode use sandbox. */
  production: boolean
  topic: string
}

const b64url = (bytes: Uint8Array | string) => {
  const s = typeof bytes === 'string' ? bytes : String.fromCharCode(...bytes)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** The provider token Apple asks for: an ES256 JWT signed with the .p8 key. */
export async function apnsJwt(cfg: Pick<ApnsConfig, 'key' | 'keyId' | 'teamId'>, now: number) {
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: cfg.keyId }))
  const claims = b64url(JSON.stringify({ iss: cfg.teamId, iat: now }))
  const pem = cfg.key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0))
  const key = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  // WebCrypto returns the raw r||s signature, which is exactly what JWS ES256 uses.
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  )
  return `${header}.${claims}.${b64url(new Uint8Array(sig))}`
}

let cached: { token: string; at: number } | null = null

/** Apple wants the token reused, and refreshed between 20 and 60 minutes. */
async function providerToken(cfg: ApnsConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cached && now - cached.at < 40 * 60) return cached.token
  cached = { token: await apnsJwt(cfg, now), at: now }
  return cached.token
}

export function apnsBody(p: { title: string; body: string | null; link: string | null }) {
  return {
    aps: { alert: { title: p.title, ...(p.body ? { body: p.body } : {}) }, sound: 'default' },
    // Read by the app when the notification is tapped (native/bootstrap.ts).
    ...(p.link && /^\/(?![/\\])/.test(p.link) ? { link: p.link } : {}),
  }
}

/** Apple's way of saying the token will never work again. */
export function isDeadApnsToken(status: number, reason: string | undefined): boolean {
  return (
    status === 410 || (status === 400 && (reason === 'BadDeviceToken' || reason === 'Unregistered'))
  )
}

export async function sendApns(
  cfg: ApnsConfig,
  device: string,
  p: { title: string; body: string | null; link: string | null },
): Promise<{ ok: boolean; status: number; reason?: string }> {
  const host = cfg.production ? 'api.push.apple.com' : 'api.sandbox.push.apple.com'
  const res = await fetch(`https://${host}/3/device/${encodeURIComponent(device)}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${await providerToken(cfg)}`,
      'apns-topic': cfg.topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    },
    body: JSON.stringify(apnsBody(p)),
  })
  if (res.ok) return { ok: true, status: res.status }
  const detail = (await res.json().catch(() => null)) as { reason?: string } | null
  return { ok: false, status: res.status, reason: detail?.reason }
}
