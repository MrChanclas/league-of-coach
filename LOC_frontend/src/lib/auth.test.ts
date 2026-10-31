import { describe, expect, it } from 'vitest'
import { EMPTY_PASSWORD_STRENGTH } from '../constants'
import { getClerkErrorMessage, getPasswordStrength } from './auth'

describe('getPasswordStrength', () => {
  it('rates an empty password as no bars filled', () => {
    expect(getPasswordStrength('')).toBe(EMPTY_PASSWORD_STRENGTH)
  })

  it('rewards length, mixed case and symbols', () => {
    expect(getPasswordStrength('abc').label).toBe('DÉBIL')
    expect(getPasswordStrength('abcdefghij').filled).toBe(2)
    expect(getPasswordStrength('Abcdefghijkl9!').label).toBe('SÓLIDA')
  })
})

describe('getClerkErrorMessage', () => {
  it('prefers the long Clerk message, then the short one, then the fallback', () => {
    expect(getClerkErrorMessage({ errors: [{ message: 'corto', longMessage: 'largo' }] }, 'x')).toBe('largo')
    expect(getClerkErrorMessage({ errors: [{ message: 'corto' }] }, 'x')).toBe('corto')
    expect(getClerkErrorMessage({ errors: [] }, 'x')).toBe('x')
  })

  it('uses a plain error message when it is not a Clerk error', () => {
    expect(getClerkErrorMessage(new Error('sin red'), 'x')).toBe('sin red')
    expect(getClerkErrorMessage('???', 'x')).toBe('x')
  })
})
