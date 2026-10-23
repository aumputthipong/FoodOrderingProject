import { eq } from 'drizzle-orm'
import type { Role } from '@canteen/shared'
import { db, type DbClient } from '../../db/client'
import { authTokens, shops, users } from '../../db/schema'
import type { UserRow } from './auth.mapper'

const userColumns = {
  id: users.id,
  username: users.username,
  firstName: users.firstName,
  lastName: users.lastName,
  email: users.email,
  mobile: users.mobile,
  role: users.role,
  shopId: shops.id,
}

export type NewUser = {
  username: string
  passwordHash: string
  firstName: string
  lastName: string
  email: string
  mobile: string
  role: Role
}

export async function usernameExists(username: string, client: DbClient = db): Promise<boolean> {
  const rows = await client
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
  return rows.length > 0
}

export async function insertUser(input: NewUser, client: DbClient = db): Promise<number> {
  const [result] = await client.insert(users).values(input)
  return result.insertId
}

export async function findUserById(id: number, client: DbClient = db): Promise<UserRow | null> {
  const rows = await client
    .select(userColumns)
    .from(users)
    .leftJoin(shops, eq(shops.ownerId, users.id))
    .where(eq(users.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function findCredentialsByUsername(
  username: string,
  client: DbClient = db,
): Promise<{ id: number; passwordHash: string } | null> {
  const rows = await client
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
  return rows[0] ?? null
}

export async function insertToken(
  userId: number,
  tokenHash: string,
  client: DbClient = db,
): Promise<void> {
  await client.insert(authTokens).values({ userId, tokenHash })
}

export async function findUserByTokenHash(
  tokenHash: string,
  client: DbClient = db,
): Promise<UserRow | null> {
  const rows = await client
    .select(userColumns)
    .from(authTokens)
    .innerJoin(users, eq(users.id, authTokens.userId))
    .leftJoin(shops, eq(shops.ownerId, users.id))
    .where(eq(authTokens.tokenHash, tokenHash))
    .limit(1)
  return rows[0] ?? null
}

export async function deleteToken(tokenHash: string, client: DbClient = db): Promise<void> {
  await client.delete(authTokens).where(eq(authTokens.tokenHash, tokenHash))
}
