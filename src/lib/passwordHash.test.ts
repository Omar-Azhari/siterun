import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './passwordHash'

describe('password hashing', () => {
  it('stores a salted hash, not the password', async () => {
    const stored = await hashPassword('SiteRun!2026')
    expect(stored).not.toContain('SiteRun!2026')
    expect(stored.startsWith('pbkdf2$150000$')).toBe(true)
  })

  it('uses a fresh salt each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'))
  })

  it('accepts the right password and rejects the wrong one', async () => {
    const stored = await hashPassword('correct horse')
    expect(await verifyPassword(stored, 'correct horse')).toBe(true)
    expect(await verifyPassword(stored, 'correct horse ')).toBe(false)
    expect(await verifyPassword(stored, '')).toBe(false)
  })

  it('still accepts the seeded demo password', async () => {
    expect(await verifyPassword('SiteRun!2026', 'SiteRun!2026')).toBe(true)
    expect(await verifyPassword('SiteRun!2026', 'wrong')).toBe(false)
    expect(await verifyPassword(undefined, 'anything')).toBe(false)
  })
})
