import { createHash, randomBytes } from 'node:crypto'

/** A new opaque bearer token: 32 random bytes as 64 hex characters. */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/** The SHA-256 hex digest stored in `auth_tokens.token_hash` (the raw token is never stored). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
