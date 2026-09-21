import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safePath'

describe('safeNextPath', () => {
  it('keeps paths on this site', () => {
    expect(safeNextPath('/payments')).toBe('/payments')
    expect(safeNextPath('/machines/abc/book?start=2026-10-01')).toBe(
      '/machines/abc/book?start=2026-10-01',
    )
  })

  it('refuses other hosts and odd values', () => {
    for (const bad of [
      null,
      undefined,
      '',
      'payments',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      `/a${String.fromCharCode(0)}b`,
      '/a\nb',
      '/a\tb',
    ]) {
      expect(safeNextPath(bad)).toBeNull()
    }
  })
})
