import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    migrate: 'src/db/migrate.ts',
    seed: 'src/db/seed.ts',
  },
  format: ['esm'],
  target: 'node24',
  outDir: 'dist',
  clean: true,
  // packages/shared is source-only (TypeScript exports), so it must be bundled.
  noExternal: ['@canteen/shared'],
})
