import { describe, expect, it } from 'vitest'
import { buildMessage, isDeadToken } from './fcm'
import { allowedOrigins, corsHeaders, sameSecret } from './http'
import { cardBrand, parseAction } from './stripeLogic'

describe('payments request validation', () => {
  const pay = {
    action: 'pay',
    amountCents: 1000,
    methodId: '0b2c8ece-4fea-4dff-ab03-61a4c574c6bf',
    idempotencyKey: 'a1b2c3d4-e5f6',
  }

  it('accepts well-formed actions', () => {
    expect(parseAction({ action: 'setup' })).toEqual({ action: 'setup' })
    expect(parseAction({ action: 'save', setupIntentId: 'seti_123abc' })).toEqual({
      action: 'save',
      setupIntentId: 'seti_123abc',
    })
    expect(parseAction(pay)).toEqual(pay)
    expect(parseAction({ action: 'confirm', paymentIntentId: 'pi_9' })).toEqual({
      action: 'confirm',
      paymentIntentId: 'pi_9',
    })
  })

  it('refuses bad amounts, ids and unknown actions', () => {
    for (const amountCents of [0, -5, 49, 10.5, '1000', 100_000_001]) {
      expect(parseAction({ ...pay, amountCents })).toHaveProperty('error')
    }
    expect(parseAction({ ...pay, methodId: 'x' })).toHaveProperty('error')
    expect(parseAction({ ...pay, idempotencyKey: 'short' })).toHaveProperty('error')
    expect(parseAction({ action: 'save', setupIntentId: 'pi_123' })).toHaveProperty('error')
    expect(parseAction({ action: 'confirm', paymentIntentId: 'pi_1;drop' })).toHaveProperty('error')
    expect(parseAction({ action: 'refund' })).toHaveProperty('error')
    expect(parseAction(null)).toHaveProperty('error')
  })

  it('only takes the card brands SiteRun supports', () => {
    expect(cardBrand('visa')).toBe('visa')
    expect(cardBrand('amex')).toBe('amex')
    expect(cardBrand('discover')).toBeNull()
    expect(cardBrand(undefined)).toBeNull()
  })
})

describe('CORS', () => {
  const allowed = allowedOrigins('https://siterun.com.au/, https://www.siterun.com.au')

  it('echoes only allowed origins', () => {
    expect(corsHeaders('https://siterun.com.au', allowed)['Access-Control-Allow-Origin']).toBe(
      'https://siterun.com.au',
    )
    expect(corsHeaders('capacitor://localhost', allowed)['Access-Control-Allow-Origin']).toBe(
      'capacitor://localhost',
    )
    expect(corsHeaders('https://evil.example', allowed)).not.toHaveProperty(
      'Access-Control-Allow-Origin',
    )
    expect(corsHeaders(null, allowed)).not.toHaveProperty('Access-Control-Allow-Origin')
  })
})

describe('shared secret check', () => {
  it('matches only the exact secret', () => {
    expect(sameSecret('abc123', 'abc123')).toBe(true)
    expect(sameSecret('abc124', 'abc123')).toBe(false)
    expect(sameSecret('abc', 'abc123')).toBe(false)
    expect(sameSecret('', 'abc123')).toBe(false)
  })
})

describe('push messages', () => {
  it('builds an FCM message with the in-app link', () => {
    const m = buildMessage('tok', {
      title: 'Booking Confirmed',
      body: 'SR-2026-7815',
      link: '/hires/1',
      tokens: [],
    })
    expect(m.message.token).toBe('tok')
    expect(m.message.notification).toEqual({ title: 'Booking Confirmed', body: 'SR-2026-7815' })
    expect(m.message.data).toEqual({ link: '/hires/1' })
  })

  it('never sends a link that leaves the app', () => {
    const m = buildMessage('tok', {
      title: 'x',
      body: null,
      link: 'https://evil.example',
      tokens: [],
    })
    expect(m.message.data).toEqual({})
    expect(m.message.notification).toEqual({ title: 'x' })
    const m2 = buildMessage('tok', { title: 'x', body: null, link: '//evil.example', tokens: [] })
    expect(m2.message.data).toEqual({})
  })

  it('recognises dead tokens', () => {
    expect(isDeadToken(404, null)).toBe(true)
    expect(
      isDeadToken(400, {
        error: { status: 'INVALID_ARGUMENT', details: [{ errorCode: 'UNREGISTERED' }] },
      }),
    ).toBe(true)
    expect(
      isDeadToken(400, {
        error: {
          status: 'INVALID_ARGUMENT',
          message: 'The registration token is not a valid FCM registration token',
        },
      }),
    ).toBe(true)
    expect(isDeadToken(500, { error: { status: 'INTERNAL' } })).toBe(false)
    expect(isDeadToken(429, { error: { status: 'RESOURCE_EXHAUSTED' } })).toBe(false)
  })
})

describe('Google service account token', () => {
  it('signs an RS256 JWT that verifies with the account public key', async () => {
    const { signJwt } = await import('./fcm')
    const pair = await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END PRIVATE KEY-----\n`
    const jwt = await signJwt(
      { project_id: 'p', client_email: 'push@p.iam.gserviceaccount.com', private_key: pem },
      1_800_000_000,
    )
    const [h, c, s] = jwt.split('.') as [string, string, string]
    const unb64 = (x: string) =>
      Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0))
    const ok = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      pair.publicKey,
      unb64(s),
      new TextEncoder().encode(`${h}.${c}`),
    )
    expect(ok).toBe(true)
    const claims = JSON.parse(new TextDecoder().decode(unb64(c)))
    expect(claims).toMatchObject({
      iss: 'push@p.iam.gserviceaccount.com',
      aud: 'https://oauth2.googleapis.com/token',
      exp: 1_800_003_600,
    })
  })
})

describe('Apple push', () => {
  it('signs an ES256 provider token that verifies with the key', async () => {
    const { apnsJwt } = await import('./apns')
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
    const key = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8))}\n-----END PRIVATE KEY-----`
    const jwt = await apnsJwt({ key, keyId: 'ABC123DEFG', teamId: 'TEAM123456' }, 1_800_000_000)
    const [h, c, s] = jwt.split('.') as [string, string, string]
    const unb64 = (x: string) =>
      Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0))
    expect(JSON.parse(new TextDecoder().decode(unb64(h)))).toEqual({
      alg: 'ES256',
      kid: 'ABC123DEFG',
    })
    expect(JSON.parse(new TextDecoder().decode(unb64(c)))).toEqual({
      iss: 'TEAM123456',
      iat: 1_800_000_000,
    })
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      unb64(s),
      new TextEncoder().encode(`${h}.${c}`),
    )
    expect(ok).toBe(true)
  })

  it('builds the alert with an in-app link only', async () => {
    const { apnsBody } = await import('./apns')
    expect(apnsBody({ title: 'Delivered', body: 'On site', link: '/hires/1' })).toEqual({
      aps: { alert: { title: 'Delivered', body: 'On site' }, sound: 'default' },
      link: '/hires/1',
    })
    expect(apnsBody({ title: 'x', body: null, link: '//evil.example' })).toEqual({
      aps: { alert: { title: 'x' }, sound: 'default' },
    })
  })

  it('recognises dead device tokens', async () => {
    const { isDeadApnsToken } = await import('./apns')
    expect(isDeadApnsToken(410, 'Unregistered')).toBe(true)
    expect(isDeadApnsToken(400, 'BadDeviceToken')).toBe(true)
    expect(isDeadApnsToken(400, 'BadTopic')).toBe(false)
    expect(isDeadApnsToken(429, 'TooManyRequests')).toBe(false)
  })
})

describe('payout and refund requests', () => {
  it('validates the new actions', () => {
    expect(parseAction({ action: 'connect-start' })).toEqual({
      action: 'connect-start',
      returnPath: '/supplier/payouts',
    })
    expect(
      parseAction({ action: 'connect-start', returnPath: '/supplier/payouts?done=1' }),
    ).toEqual({
      action: 'connect-start',
      returnPath: '/supplier/payouts?done=1',
    })
    expect(parseAction({ action: 'connect-start', returnPath: '//evil.example' })).toEqual({
      action: 'connect-start',
      returnPath: '/supplier/payouts',
    })
    expect(parseAction({ action: 'payout', idempotencyKey: 'a1b2c3d4-e5f6' })).toHaveProperty(
      'action',
      'payout',
    )
    expect(parseAction({ action: 'payout' })).toHaveProperty('error')
    const refund = {
      action: 'refund',
      paymentId: '0b2c8ece-4fea-4dff-ab03-61a4c574c6bf',
      amountCents: 500,
      reason: 'Overcharged',
    }
    expect(parseAction(refund)).toEqual(refund)
    expect(parseAction({ ...refund, amountCents: 0 })).toHaveProperty('error')
    expect(parseAction({ ...refund, reason: 'no' })).toHaveProperty('error')
  })
})

describe('notification email', () => {
  const payload = {
    to: 'alex@acme.test',
    name: 'Alex',
    title: 'Booking Confirmed',
    body: 'SR-2026-7815 · 5t Excavator',
    link: '/bookings/1',
    type: 'booking',
  }

  it('links back into the app and escapes what people typed', async () => {
    const { htmlBody, subjectFor, textBody, actionUrl } = await import('./emailTemplate')
    expect(actionUrl('https://siterun.com.au/', '/bookings/1')).toBe(
      'https://siterun.com.au/bookings/1',
    )
    expect(actionUrl('https://siterun.com.au', '//evil.example')).toBeNull()
    expect(subjectFor(payload)).toBe('Booking Confirmed — SR-2026-7815')
    const html = htmlBody(
      { ...payload, title: '<script>alert(1)</script>' },
      'https://siterun.com.au',
    )
    expect(html).not.toContain('<script>alert(1)')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('https://siterun.com.au/bookings/1')
    expect(textBody(payload, 'https://siterun.com.au')).toContain(
      'Open SiteRun: https://siterun.com.au/bookings/1',
    )
  })
})
