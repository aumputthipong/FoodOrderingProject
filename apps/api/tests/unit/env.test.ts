import path from 'node:path'
import { parseEnv } from '../../src/config/env.js'

const base = { DATABASE_URL: 'mysql://u:p@localhost:3307/canteen' }

test('applies defaults', () => {
  const e = parseEnv(base)
  expect(e.PORT).toBe(3000)
  expect(e.UPLOAD_MAX_MB).toBe(5)
  expect(e.LOGIN_RATE_LIMIT_PER_MINUTE).toBe(10)
  expect(e.CORS_ORIGINS).toEqual(['http://localhost:5173'])
  expect(path.isAbsolute(e.UPLOAD_DIR)).toBe(true)
})

test('splits and trims CORS_ORIGINS', () => {
  expect(parseEnv({ ...base, CORS_ORIGINS: 'http://a.test, http://b.test' }).CORS_ORIGINS).toEqual([
    'http://a.test',
    'http://b.test',
  ])
})

test('throws naming the missing variable', () => {
  expect(() => parseEnv({})).toThrow(/DATABASE_URL/)
})

test('rejects a non-numeric PORT', () => {
  expect(() => parseEnv({ ...base, PORT: 'abc' })).toThrow(/PORT/)
})
