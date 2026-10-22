import { drizzle } from 'drizzle-orm/mysql2'
import { createPool } from 'mysql2/promise'
import { env } from '../config/env'
import * as schema from './schema'

const pool = createPool({ uri: env.DATABASE_URL, charset: 'utf8mb4' })

export const db = drizzle(pool, { schema, mode: 'default', casing: 'snake_case' })

export type Db = typeof db
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbClient = Db | Tx

export function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(fn)
}

export async function closeDb(): Promise<void> {
  await pool.end()
}
