import { describe, expect, it } from 'vitest'

import { withProfileName } from '../test/handlers'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('uses the first letter of the first and last name', () => {
    expect(getInitials(withProfileName('jane', 'Doe'))).toBe('JD')
  })

  it('falls back to the first letter of the email without a name', () => {
    expect(getInitials(withProfileName(null, null))).toBe('T')
  })
})
