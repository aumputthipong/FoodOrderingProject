import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const apiRoot = fileURLToPath(new URL('../..', import.meta.url))

// Path settings are resolved against apps/api so tests behave the same
// whether vitest is started from the repo root or from apps/api.
const PATH_KEYS = ['UPLOAD_DIR', 'MIGRATIONS_DIR', 'SEED_IMAGES_DIR'] as const
const PATH_DEFAULTS: Record<(typeof PATH_KEYS)[number], string> = {
  // Never the dev `uploads` dir: global setup deletes this directory.
  UPLOAD_DIR: 'tmp/test-uploads',
  MIGRATIONS_DIR: 'src/db/migrations',
  SEED_IMAGES_DIR: 'seed/images',
}

/** The test environment from the parsed `.env.test`, with defaults and absolute paths. */
export function resolveTestEnv(parsed: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== undefined) result[key] = value
  }
  for (const key of PATH_KEYS) {
    result[key] = path.resolve(apiRoot, result[key] ?? PATH_DEFAULTS[key])
  }
  return result
}

export function loadTestEnv(): Record<string, string> {
  return resolveTestEnv(parseEnv(readFileSync(path.join(apiRoot, '.env.test'), 'utf8')))
}

/**
 * Throws unless `uploadDir` is strictly inside `<root>/tmp`, so that wiping the test uploads can
 * never delete real files (such as the dev `uploads` dir) because of a misconfigured `.env.test`.
 */
export function assertSafeTestUploadDir(uploadDir: string, root: string = apiRoot): void {
  const tmpDir = path.resolve(root, 'tmp')
  const relative = path.relative(tmpDir, path.resolve(uploadDir))
  const inside =
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  if (!inside) {
    throw new Error(
      `Refusing to remove test UPLOAD_DIR "${uploadDir}": it must be inside "${tmpDir}"`,
    )
  }
}
