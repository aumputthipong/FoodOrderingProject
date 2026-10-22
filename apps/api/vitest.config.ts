import { defineConfig } from 'vitest/config'
import { loadTestEnv } from './tests/setup/test-env.ts'

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: loadTestEnv(),
    globalSetup: ['./tests/setup/global-setup.ts'],
    setupFiles: ['./tests/setup/each-test.ts'],
    fileParallelism: false,
  },
})
