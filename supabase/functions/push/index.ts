// Sends a notification to the recipient's phones: Android through Firebase Cloud
// Messaging, iPhones through Apple's push service (Capacitor gives iPhones an APNs token).
// Called only by the database (trigger private.queue_push on public.notifications), which
// sends a shared secret kept in Vault; any other caller is refused.
//
// Secrets (see LAUNCH.md), each platform is skipped until its secrets are set:
//   Android  FIREBASE_SERVICE_ACCOUNT  service account JSON from Firebase
//   iOS      APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID, and APNS_ENV=sandbox for Xcode builds
import { isDeadApnsToken, sendApns, type ApnsConfig } from '../_shared/apns.ts'
import { admin } from '../_shared/clients.ts'
import {
  accessToken,
  buildMessage,
  isDeadToken,
  type PushPayload,
  type ServiceAccount,
} from '../_shared/fcm.ts'
import { json, sameSecret } from '../_shared/http.ts'

const APP_ID = 'au.com.siterun.app'
let hookSecret: string | null = null

async function expectedSecret(): Promise<string | null> {
  if (hookSecret) return hookSecret
  const { data } = await admin.rpc('push_hook_secret')
  hookSecret = typeof data === 'string' && data.length >= 32 ? data : null
  return hookSecret
}

function firebase(): ServiceAccount | null {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  if (!raw) return null
  try {
    const sa = JSON.parse(raw) as ServiceAccount
    return sa.project_id && sa.client_email && sa.private_key ? sa : null
  } catch {
    return null
  }
}

function apple(): ApnsConfig | null {
  const key = Deno.env.get('APNS_KEY')
  const keyId = Deno.env.get('APNS_KEY_ID')
  const teamId = Deno.env.get('APNS_TEAM_ID')
  if (!key || !keyId || !teamId) return null
  return { key, keyId, teamId, production: Deno.env.get('APNS_ENV') !== 'sandbox', topic: APP_ID }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)
  const expected = await expectedSecret()
  const given = req.headers.get('x-siterun-hook') ?? ''
  if (!expected || !sameSecret(given, expected)) return json({ error: 'Forbidden.' }, 403)

  const body = (await req.json().catch(() => null)) as { notification_id?: unknown } | null
  const id = body?.notification_id
  if (typeof id !== 'string' || !UUID.test(id)) return json({ error: 'Bad request.' }, 400)

  const fcm = firebase()
  const apns = apple()
  if (!fcm && !apns) return json({ skipped: 'Push secrets are not set' })

  const { data, error } = await admin.rpc('push_payload', { p_notification: id })
  if (error) return json({ error: 'Lookup failed.' }, 500)
  const payload = data as PushPayload | null
  if (!payload?.tokens?.length) return json({ sent: 0 })

  const dead: string[] = []
  let sent = 0
  let skipped = 0
  try {
    const fcmToken = fcm ? await accessToken(fcm) : null
    await Promise.all(
      payload.tokens.map(async ({ token: device, platform }) => {
        if (platform === 'ios') {
          if (!apns) return void skipped++
          const r = await sendApns(apns, device, payload)
          if (r.ok) sent++
          else if (isDeadApnsToken(r.status, r.reason)) dead.push(device)
          else console.error('apns failed', r.status, r.reason)
          return
        }
        if (!fcm || !fcmToken) return void skipped++
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${fcm.project_id}/messages:send`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${fcmToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(buildMessage(device, payload)),
          },
        )
        if (res.ok) return void sent++
        const detail = await res.json().catch(() => null)
        if (isDeadToken(res.status, detail)) dead.push(device)
        else console.error('fcm failed', res.status, JSON.stringify(detail)?.slice(0, 300))
      }),
    )
    if (dead.length) await admin.rpc('forget_push_tokens', { p_tokens: dead })
    return json({ sent, skipped, removed: dead.length })
  } catch (e) {
    console.error('push failed', e instanceof Error ? e.message : e)
    return json({ error: 'Send failed.' }, 500)
  }
})
