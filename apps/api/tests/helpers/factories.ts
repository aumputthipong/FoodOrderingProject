import path from 'node:path'
import bcrypt from 'bcrypt'
import type { Role } from '@canteen/shared'
import { db } from '../../src/db/client'
import { shops, users } from '../../src/db/schema'
import { api } from './app'

const DEFAULT_PASSWORD = 'Password123'
let sequence = 0

type UserOverrides = Partial<{ username: string; role: Role; firstName: string; mobile: string }>
export type CreatedUser = { id: number; username: string; password: string; role: Role }

/** A real 1x1 PNG for multipart upload tests. */
export const fixtureImage = path.join(import.meta.dirname, '..', 'fixtures', 'pixel.png')

/** Inserts a user straight into the DB (bcrypt cost 10, default password `Password123`). */
export async function createUser(overrides: UserOverrides = {}): Promise<CreatedUser> {
  sequence += 1
  const username = overrides.username ?? `user${String(sequence).padStart(4, '0')}`
  const role = overrides.role ?? 'customer'
  const [result] = await db.insert(users).values({
    username,
    passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
    firstName: overrides.firstName ?? 'Test',
    lastName: 'User',
    email: `${username}@example.com`,
    mobile: overrides.mobile ?? '0812345678',
    role,
  })
  return { id: result.insertId, username, password: DEFAULT_PASSWORD, role }
}

/** Logs in through the real endpoint and returns the issued token. */
export async function loginAs(user: { username: string; password: string }): Promise<string> {
  const res = await api().post('/api/auth/login').send(user)
  if (res.status !== 200) throw new Error(`loginAs failed: ${res.status} ${res.text}`)
  return (res.body as { token: string }).token
}

/** Creates a merchant, inserts their shop (no image) straight into the DB and logs them in. */
export async function createMerchantWithShop(
  overrides: UserOverrides & { shopName?: string } = {},
): Promise<{ user: CreatedUser; token: string; shop: { id: number } }> {
  const { shopName, ...userOverrides } = overrides
  const user = await createUser({ ...userOverrides, role: userOverrides.role ?? 'merchant' })
  const [result] = await db.insert(shops).values({
    ownerId: user.id,
    name: shopName ?? `Shop of ${user.username}`,
    description: 'Shop description',
  })
  return { user, token: await loginAs(user), shop: { id: result.insertId } }
}
