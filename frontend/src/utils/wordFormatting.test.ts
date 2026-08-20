import { describe, expect, it } from 'vitest'

import { formatTitle } from './wordFormatting'

describe('formatTitle', () => {
  it('returns an empty string for null', () => {
    expect(formatTitle(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(formatTitle(undefined)).toBe('')
  })

  it('returns an empty string for an empty string', () => {
    expect(formatTitle('')).toBe('')
  })

  it('replaces hyphens with spaces', () => {
    expect(formatTitle('privacy-policy')).toBe('Privacy policy')
  })

  it('capitalises the first character and lowercases the rest', () => {
    expect(formatTitle('TERMS AND CONDITIONS')).toBe('Terms and conditions')
  })

  it('trims surrounding whitespace', () => {
    expect(formatTitle('  account  ')).toBe('Account')
  })

  it('handles multiple hyphens', () => {
    expect(formatTitle('terms-and-conditions')).toBe('Terms and conditions')
  })
})