import type { User } from '@canteen/shared'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'
import { homeFor } from '@/features/auth/redirect'

export function resolveGuard(
  to: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>,
  user: User | null,
): true | RouteLocationRaw {
  const { guestOnly, requiresAuth, roles, requiresShop, requiresNoShop, staffHome } = to.meta
  if (guestOnly && user) return homeFor(user)
  // merchants land on their own dashboard; they can still open any shop page as a customer
  if (staffHome && user && user.role !== 'customer') return homeFor(user)
  if (requiresAuth && !user) return { name: 'login', query: { redirect: to.fullPath } }
  if (roles && (!user || !roles.includes(user.role))) return { name: 'home' }
  if (requiresShop && user?.shopId === null) return { name: 'merchant-shop-new' }
  if (requiresNoShop && user?.shopId !== null) return { name: 'merchant-shop' }
  return true
}
