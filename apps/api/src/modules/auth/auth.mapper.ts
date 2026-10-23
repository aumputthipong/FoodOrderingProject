import type { Role, User } from '@canteen/shared'

export type UserRow = {
  id: number
  username: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  role: Role
  shopId: number | null
}

/** Maps a repository row to the public `User`; picks fields explicitly so hashes can never leak. */
export function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    mobile: row.mobile,
    role: row.role,
    shopId: row.shopId,
  }
}
