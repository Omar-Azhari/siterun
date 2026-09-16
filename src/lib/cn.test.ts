import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('drops falsy values', () => {
    expect(cn('a', false, null, undefined, 0, 'b')).toBe('a b')
  })
  it('lets later utilities override earlier ones', () => {
    expect(cn('w-full h-12 px-3.5', 'w-[108px] px-3')).toBe('h-12 w-[108px] px-3')
  })
  it('keeps custom colour tokens separate from font sizes', () => {
    expect(cn('text-sm text-muted')).toBe('text-sm text-muted')
    expect(cn('text-muted', 'text-fg')).toBe('text-fg')
    expect(cn('border-line-input', 'border-danger')).toBe('border-danger')
  })
})
