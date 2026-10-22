import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'
import { defineConfig } from 'vitest/config'

const testEnv = parseEnv(
  readFileSync(fileURLToPath(new URL('./.env.test', import.meta.url)), 'utf8'),
)

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: testEnv as Record<string, string>,
  },
})
