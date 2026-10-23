import type { User } from '@canteen/shared'
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export function resolveGuard(
  to: Pick<RouteLocationNormalized, 'meta' | 'fullPath'>,
  user: User | null,
): true | RouteLocationRaw {
  const { guestOnly, requiresAuth, roles, requiresShop, requiresNoShop } = to.meta
  if (guestOnly && user) return { name: 'home' }
  if (requiresAuth && !user) return { name: 'login', query: { redirect: to.fullPath } }
  if (roles && (!user || !roles.includes(user.role))) return { name: 'home' }
  if (requiresShop && user?.shopId === null) return { name: 'merchant-shop-new' }
  if (requiresNoShop && user?.shopId !== null) return { name: 'merchant-shop' }
  return true
}
