import { existsSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

const absolutePath = (fallback: string) =>
  z
    .string()
    .min(1)
    .default(fallback)
    .transform((value) => path.resolve(process.cwd(), value))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  UPLOAD_DIR: absolutePath('uploads'),
  UPLOAD_MAX_MB: z.coerce.number().int().min(1).default(5),
  LOGIN_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(1).default(10),
  MIGRATIONS_DIR: absolutePath('src/db/migrations'),
  SEED_IMAGES_DIR: absolutePath('seed/images'),
})

export type Env = z.output<typeof schema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = schema.safeParse(source)
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))]
    const details = result.error.issues
      .map((issue) => `${String(issue.path[0])}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment variables (${names.join(', ')}): ${details}`)
  }
  return result.data
}

function loadEnv(): Env {
  if (process.env.NODE_ENV !== 'test' && existsSync('.env')) {
    process.loadEnvFile('.env')
  }
  return parseEnv(process.env)
}

export const env: Env = loadEnv()
