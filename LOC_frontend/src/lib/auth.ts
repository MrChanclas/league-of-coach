import { EMPTY_PASSWORD_STRENGTH, PASSWORD_STRENGTH_LEVELS } from '../constants'
import type { ClerkErrorLike } from '../types/auth'

export function getClerkErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'errors' in error) {
    const clerkError = error as ClerkErrorLike
    return clerkError.errors?.[0]?.longMessage ?? clerkError.errors?.[0]?.message ?? fallback
  }
  return error instanceof Error ? error.message : fallback
}

export function getPasswordStrength(password: string) {
  if (!password) return EMPTY_PASSWORD_STRENGTH

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1

  return PASSWORD_STRENGTH_LEVELS[Math.min(score, PASSWORD_STRENGTH_LEVELS.length - 1)]
}
