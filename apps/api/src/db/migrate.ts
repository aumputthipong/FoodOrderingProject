import { pathToFileURL } from 'node:url'
import { migrate } from 'drizzle-orm/mysql2/migrator'
import { env } from '../config/env'
import { closeDb, db } from './client'

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder: env.MIGRATIONS_DIR })
}

const entry = process.argv[1]
if (entry && import.meta.url === pathToFileURL(entry).href) {
  try {
    await runMigrations()
  } finally {
    await closeDb()
  }
}
