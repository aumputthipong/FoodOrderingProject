import { rmSync } from 'node:fs'
import { assertSafeTestUploadDir, loadTestEnv } from './test-env'

function fail(message: string): never {
  // vitest 5 can crash while printing globalSetup stack traces, hiding the message
  console.error(message)
  throw new Error(message)
}

export default async function setup(): Promise<void> {
  // globalSetup runs in the main process where `test.env` may not be applied,
  // so populate process.env ourselves before anything imports config/env.
  Object.assign(process.env, loadTestEnv())

  const databaseUrl = process.env.DATABASE_URL ?? ''
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, '')
  if (!databaseName.endsWith('_test')) {
    fail(
      `Refusing to run tests against non-test database "${databaseName}" (name must end with _test)`,
    )
  }

  // Dynamic imports: config/env.ts parses process.env at import time.
  const { env } = await import('../../src/config/env')
  const { runMigrations } = await import('../../src/db/migrate')
  const { closeDb } = await import('../../src/db/client')

  // Checked before anything runs: the directory is wiped below.
  try {
    assertSafeTestUploadDir(env.UPLOAD_DIR)
  } catch (err) {
    await closeDb()
    fail((err as Error).message)
  }

  try {
    await runMigrations()
  } finally {
    await closeDb()
  }
  rmSync(env.UPLOAD_DIR, { recursive: true, force: true })
}
