import { describe, expect, it } from 'vitest'
import { formatAbn, isValidAbn } from './abn'

describe('isValidAbn', () => {
  it('accepts a valid ABN with or without spaces', () => {
    // Example ABN published by the ATO
    expect(isValidAbn('51 824 753 556')).toBe(true)
    expect(isValidAbn('51824753556')).toBe(true)
  })
  it('rejects bad checksums and lengths', () => {
    expect(isValidAbn('51 824 753 557')).toBe(false)
    expect(isValidAbn('1234')).toBe(false)
    expect(isValidAbn('5182475355a')).toBe(false)
  })
})

describe('formatAbn', () => {
  it('groups digits 2-3-3-3', () => {
    expect(formatAbn('51824753556')).toBe('51 824 753 556')
    expect(formatAbn('518')).toBe('51 8')
  })
})
