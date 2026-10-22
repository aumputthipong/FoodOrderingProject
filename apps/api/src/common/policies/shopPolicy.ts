import type { User } from '@canteen/shared'

/** The shop's owner and admins may manage a shop and everything in it. */
export function canManageShop(user: Pick<User, 'id' | 'role'>, shop: { ownerId: number }): boolean {
  return user.role === 'admin' || user.id === shop.ownerId
}
