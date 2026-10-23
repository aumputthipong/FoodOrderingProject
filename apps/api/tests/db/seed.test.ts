import fs from 'node:fs'
import path from 'node:path'
import { count } from 'drizzle-orm'
import type { MySqlTable } from 'drizzle-orm/mysql-core'
import { env } from '../../src/config/env'
import { db } from '../../src/db/client'
import { products, shops, users } from '../../src/db/schema'
import { seed } from '../../src/db/seed'
import { seedProducts } from '../../src/db/seed-data'
import { api, auth } from '../helpers/app'
import { loginAs } from '../helpers/factories'

async function countRows(table: MySqlTable): Promise<number> {
  const [row] = await db.select({ value: count() }).from(table)
  return row?.value ?? 0
}

test('seeds demo data and images', async () => {
  expect(await seed()).toEqual({ skipped: false })
  expect(await countRows(users)).toBe(6)
  expect(await countRows(shops)).toBe(5)
  expect(await countRows(products)).toBe(5)
  for (const s of await db.select().from(shops)) {
    expect(fs.existsSync(path.join(env.UPLOAD_DIR, s.imageFilename!))).toBe(true)
  }
  for (const p of await db.select().from(products)) {
    expect(fs.existsSync(path.join(env.UPLOAD_DIR, p.imageFilename!))).toBe(true)
  }
})

test('demo merchant can log in and owns shop 1', async () => {
  await seed()
  const token = await loginAs({ username: 'merchant1', password: 'Password123' })
  const me = await api().get('/api/auth/me').set(auth(token))
  expect((await api().get(`/api/shops/${me.body.shopId}`)).body.name).toBe('ร้านก๋วยเตี๋ยวโรงอาหาร')
})

test('seed is idempotent', async () => {
  await seed()
  expect(await seed()).toEqual({ skipped: true })
  expect(await countRows(users)).toBe(6)
})

test('a skipped seed still restores missing seed images', async () => {
  await seed()
  const [shop] = await db.select().from(shops).limit(1)
  const image = path.join(env.UPLOAD_DIR, shop!.imageFilename!)
  fs.rmSync(image)

  expect(await seed()).toEqual({ skipped: true })
  expect(fs.readFileSync(image)).toEqual(
    fs.readFileSync(path.join(env.SEED_IMAGES_DIR, shop!.imageFilename!)),
  )
})

test('seed never overwrites an existing file in UPLOAD_DIR', async () => {
  const image = seedProducts[0]?.image
  const target = path.join(env.UPLOAD_DIR, image!)
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(target, 'kept')
  try {
    await seed()
    expect(await seed()).toEqual({ skipped: true })
    expect(fs.readFileSync(target, 'utf8')).toBe('kept')
  } finally {
    fs.rmSync(target, { force: true })
  }
})
