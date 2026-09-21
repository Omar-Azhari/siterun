/**
 * The demo backend keeps its accounts in localStorage. A password typed into it is stored
 * as a PBKDF2-SHA256 hash with a random salt, so a password someone reuses from elsewhere
 * never sits in the browser in plain text. The seeded demo accounts keep the published
 * demo password as a plain value, which `verifyPassword` still accepts.
 *
 * Supabase Auth (the real backend) hashes passwords itself with bcrypt; the app never
 * sees or stores them.
 */
const ITERATIONS = 150_000
const PREFIX = 'pbkdf2'

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

const fromHex = (s: string) => {
  const pairs = s.match(/.{2}/g) ?? []
  const bytes = new Uint8Array(new ArrayBuffer(pairs.length))
  pairs.forEach((pair, i) => (bytes[i] = parseInt(pair, 16)))
  return bytes
}

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)))
  const digest = await derive(password, salt, ITERATIONS)
  return `${PREFIX}$${ITERATIONS}$${hex(salt)}$${hex(digest)}`
}

/** Compares in constant time so the result doesn't leak how much of the hash matched. */
const same = (a: Uint8Array, b: Uint8Array) => {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  return diff === 0
}

export async function verifyPassword(stored: string | undefined, password: string) {
  if (!stored) return false
  const [prefix, iterations, salt, digest] = stored.split('$')
  if (prefix !== PREFIX || !iterations || !salt || !digest) return stored === password
  const check = await derive(password, fromHex(salt), Number(iterations))
  return same(check, fromHex(digest))
}
