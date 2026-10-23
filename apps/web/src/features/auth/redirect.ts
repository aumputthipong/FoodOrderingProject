import type { User } from '@canteen/shared'
import type { RouteLocationRaw } from 'vue-router'

export function safeRedirect(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}

export function homeFor(user: User): RouteLocationRaw {
  return user.role === 'merchant' || user.role === 'admin'
    ? { name: 'merchant-queue' }
    : { name: 'home' }
}
