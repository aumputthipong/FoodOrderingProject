import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const apiRoot = fileURLToPath(new URL('../..', import.meta.url))

// Path settings are resolved against apps/api so tests behave the same
// whether vitest is started from the repo root or from apps/api.
const PATH_KEYS = ['UPLOAD_DIR', 'MIGRATIONS_DIR', 'SEED_IMAGES_DIR'] as const
const PATH_DEFAULTS: Record<(typeof PATH_KEYS)[number], string> = {
  UPLOAD_DIR: 'uploads',
  MIGRATIONS_DIR: 'src/db/migrations',
  SEED_IMAGES_DIR: 'seed/images',
}

export function loadTestEnv(): Record<string, string> {
  const parsed = parseEnv(readFileSync(path.join(apiRoot, '.env.test'), 'utf8'))
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) result[key] = value
  }
  for (const key of PATH_KEYS) {
    result[key] = path.resolve(apiRoot, result[key] ?? PATH_DEFAULTS[key])
  }
  return result
}
