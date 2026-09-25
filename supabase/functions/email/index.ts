// Emails a notification, through Resend. Called only by the database (trigger
// private.queue_email on public.notifications) with the same Vault secret as the push
// function; chat messages and people who turned email off never reach here.
//
// Secrets (see LAUNCH.md): RESEND_API_KEY, EMAIL_FROM (e.g. "SiteRun
// <notifications@siterun.com.au>"), SITE_URL. Without them the function does nothing.
import { admin } from '../_shared/clients.ts'
import { htmlBody, subjectFor, textBody, type EmailPayload } from '../_shared/emailTemplate.ts'
import { json, sameSecret } from '../_shared/http.ts'

let hookSecret: string | null = null

async function expectedSecret(): Promise<string | null> {
  if (hookSecret) return hookSecret
  const { data } = await admin.rpc('push_hook_secret')
  hookSecret = typeof data === 'string' && data.length >= 32 ? data : null
  return hookSecret
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

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const from = Deno.env.get('EMAIL_FROM')
  const siteUrl = Deno.env.get('SITE_URL')
  if (!apiKey || !from || !siteUrl) return json({ skipped: 'Email secrets are not set' })

  const { data, error } = await admin.rpc('email_payload', { p_notification: id })
  if (error) return json({ error: 'Lookup failed.' }, 500)
  const payload = data as EmailPayload | null
  // No row means the person turned email off, or it's a chat message.
  if (!payload?.to) return json({ sent: 0 })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: subjectFor(payload),
      html: htmlBody(payload, siteUrl),
      text: textBody(payload, siteUrl),
      tags: [{ name: 'type', value: payload.type }],
    }),
  })
  if (!res.ok) {
    console.error('email failed', res.status, (await res.text()).slice(0, 300))
    return json({ error: 'Send failed.' }, 502)
  }
  return json({ sent: 1 })
})
