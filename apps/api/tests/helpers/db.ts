import type { RowDataPacket } from 'mysql2/promise'
import { db } from '../../src/db/client'

export async function resetDb(): Promise<void> {
  // SET FOREIGN_KEY_CHECKS is per session, so pin one pooled connection for the whole reset.
  const connection = await db.$client.getConnection()
  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT table_name AS table_name FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name <> '__drizzle_migrations'`,
    )
    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    try {
      for (const row of rows) {
        await connection.query(`TRUNCATE TABLE \`${String(row.table_name)}\``)
      }
    } finally {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1')
    }
  } finally {
    connection.release()
  }
}
