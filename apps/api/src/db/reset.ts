import { pathToFileURL } from 'node:url'
import type { RowDataPacket } from 'mysql2/promise'
import { env } from '../config/env'
import { closeDb, db } from './client'
import { runMigrations } from './migrate'
import { seed } from './seed'

async function dropAllTables(): Promise<void> {
  // SET FOREIGN_KEY_CHECKS is per session, so pin one pooled connection for the whole drop.
  const connection = await db.$client.getConnection()
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT table_name AS table_name FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
    )
    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    try {
      for (const row of rows) {
        await connection.query(`DROP TABLE IF EXISTS \`${String(row.table_name)}\``)
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1')
    }
  } finally {
    connection.release()
  }
}

export async function resetDatabase(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset the database when NODE_ENV is production')
  }
  const url = new URL(env.DATABASE_URL)
  console.log(`Resetting database ${url.host}${url.pathname}`)
  await dropAllTables()
  await runMigrations()
  await seed()
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  try {
    await resetDatabase()
    console.log('Database reset complete')
  } finally {
    await closeDb()
  }
}
