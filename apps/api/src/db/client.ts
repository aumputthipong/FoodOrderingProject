import { drizzle } from 'drizzle-orm/mysql2'
import type { MySqlTransactionConfig } from 'drizzle-orm/mysql-core'
import { createPool } from 'mysql2/promise'
import { isDeadlock } from '../common/dbErrors'
import { env } from '../config/env'
import * as schema from './schema'

const pool = createPool({ uri: env.DATABASE_URL, charset: 'utf8mb4' })

export const db = drizzle(pool, { schema, mode: 'default', casing: 'snake_case' })

export type Db = typeof db
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbClient = Db | Tx

export type TransactionOptions = {
  /** Defaults to the server's level (REPEATABLE READ on InnoDB). */
  isolationLevel?: MySqlTransactionConfig['isolationLevel']
}

/** Attempts in total, including the first one, before a deadlock is rethrown. */
export const MAX_TRANSACTION_ATTEMPTS = 3

/**
 * Runs `fn` in a transaction. When InnoDB picks the transaction as a deadlock victim (and so has
 * rolled it back), the whole transaction is run again, up to `MAX_TRANSACTION_ATTEMPTS` times.
 * `fn` must therefore do all its work through `tx` and have no side effects outside it.
 */
export async function withTransaction<T>(
  fn: (tx: Tx) => Promise<T>,
  options: TransactionOptions = {},
): Promise<T> {
  const config = options.isolationLevel ? { isolationLevel: options.isolationLevel } : undefined
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction(fn, config)
    } catch (err) {
      if (attempt >= MAX_TRANSACTION_ATTEMPTS || !isDeadlock(err)) throw err
    }
  }
}

export async function closeDb(): Promise<void> {
  await pool.end()
}
