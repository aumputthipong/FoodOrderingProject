import fs from 'node:fs'
import path from 'node:path'
import { env } from '../src/config/env'
import { db } from '../src/db/client'
import { products, shops } from '../src/db/schema'
import { api, auth } from './helpers/app'
import {
  createMerchantWithShop,
  createUser,
  fixtureImage,
  loginAs,
  type CreatedUser,
} from './helpers/factories'

const notImage = path.join(import.meta.dirname, 'fixtures', 'not-image.txt')

function uploadCount(): number {
  return fs.existsSync(env.UPLOAD_DIR) ? fs.readdirSync(env.UPLOAD_DIR).length : 0
}

async function merchantToken(): Promise<{ user: CreatedUser; token: string }> {
  const user = await createUser({ role: 'merchant' })
  return { user, token: await loginAs(user) }
}

function postShop(token: string, name = 'Noodle House') {
  return api()
    .post('/api/shops')
    .set(auth(token))
    .field('name', name)
    .field('description', 'Tasty')
    .attach('image', fixtureImage)
}

describe('POST /api/shops', () => {
  test('merchant creates a shop; filename stored without path (B14)', async () => {
    const { token } = await merchantToken()
    const res = await postShop(token)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ name: 'Noodle House', description: 'Tasty' })
    expect(res.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/)
    const [row] = await db.select().from(shops)
    expect(row?.imageFilename).not.toMatch(/[\\/]/)
    expect(fs.existsSync(path.join(env.UPLOAD_DIR, row!.imageFilename!))).toBe(true)
  })

  test('the stored image is served from /uploads', async () => {
    const { token } = await merchantToken()
    const created = await postShop(token)
    const res = await api().get(created.body.imageUrl as string)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('image/png')
  })

  test('second shop for the same merchant is 409 (B8)', async () => {
    const { token } = await merchantToken()
    expect((await postShop(token)).status).toBe(201)
    const before = uploadCount()
    const res = await postShop(token, 'Another')
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('CONFLICT')
    expect(uploadCount()).toBe(before)
  })

  test('concurrent creates by one merchant give one 201 and one 409', async () => {
    const { token } = await merchantToken()
    const results = await Promise.all([postShop(token, 'A'), postShop(token, 'B')])
    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
  })

  test('customer cannot create a shop (403); anonymous gets 401', async () => {
    // No file is attached: the request is rejected before the body is read, and replying early
    // to an unread upload makes the client socket reset (ECONNRESET).
    const customer = await createUser({ role: 'customer' })
    const token = await loginAs(customer)
    const forbidden = await api()
      .post('/api/shops')
      .set(auth(token))
      .field('name', 'x')
      .field('description', 'y')
    expect(forbidden.status).toBe(403)
    expect(forbidden.body.error.code).toBe('FORBIDDEN')
    const anonymous = await api().post('/api/shops').field('name', 'x').field('description', 'y')
    expect(anonymous.status).toBe(401)
    expect(await db.select().from(shops)).toHaveLength(0)
  })

  test('admin can create a shop', async () => {
    const admin = await createUser({ role: 'admin' })
    const res = await postShop(await loginAs(admin))
    expect(res.status).toBe(201)
    expect(res.body.ownerId).toBe(admin.id)
  })

  test('missing image is a validation error on path image', async () => {
    const { token } = await merchantToken()
    const res = await api()
      .post('/api/shops')
      .set(auth(token))
      .field('name', 'Noodle House')
      .field('description', 'Tasty')
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'image' }))
  })

  test('rejects non-image files and files over UPLOAD_MAX_MB', async () => {
    const { token } = await merchantToken()
    const before = uploadCount()

    const text = await api()
      .post('/api/shops')
      .set(auth(token))
      .field('name', 'Noodle House')
      .field('description', 'Tasty')
      .attach('image', notImage)
    expect(text.status).toBe(400)
    expect(text.body.error.details).toContainEqual(expect.objectContaining({ path: 'image' }))

    const big = Buffer.alloc(Math.round(1.1 * 1024 * 1024), 1)
    const oversize = await api()
      .post('/api/shops')
      .set(auth(token))
      .field('name', 'Noodle House')
      .field('description', 'Tasty')
      .attach('image', big, { filename: 'big.png', contentType: 'image/png' })
    expect(oversize.status).toBe(400)
    expect(oversize.body.error.code).toBe('VALIDATION_ERROR')

    expect(await db.select().from(shops)).toHaveLength(0)
    expect(uploadCount()).toBe(before)
  })

  test('removes the uploaded file when field validation fails', async () => {
    const { token } = await merchantToken()
    const before = uploadCount()
    const res = await postShop(token, '')
    expect(res.status).toBe(400)
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'name' }))
    expect(uploadCount()).toBe(before)
  })

  test('Thai and emoji names round-trip through the API', async () => {
    const { token } = await merchantToken()
    const created = await postShop(token, 'ร้านป้า 🍜')
    expect(created.status).toBe(201)
    const res = await api().get(`/api/shops/${String(created.body.id)}`)
    expect(res.body.name).toBe('ร้านป้า 🍜')
  })
})

describe('GET /api/shops', () => {
  test('lists shops ordered by id', async () => {
    const first = await createMerchantWithShop({ shopName: 'First' })
    const second = await createMerchantWithShop({ shopName: 'Second' })
    const res = await api().get('/api/shops')
    expect(res.status).toBe(200)
    expect(res.body.map((s: { id: number }) => s.id)).toEqual([first.shop.id, second.shop.id])
    expect(res.body[0]).toEqual({
      id: first.shop.id,
      ownerId: first.user.id,
      name: 'First',
      description: 'Shop description',
      imageUrl: null,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T.*Z$/),
    })
  })

  test('search filters by name (B9)', async () => {
    await createMerchantWithShop({ shopName: 'Noodle House' })
    await createMerchantWithShop({ shopName: 'Drink Shop' })
    const res = await api().get('/api/shops').query({ search: 'drink' })
    expect(res.status).toBe(200)
    expect(res.body.map((s: { name: string }) => s.name)).toEqual(['Drink Shop'])
  })

  test('search treats % literally', async () => {
    await createMerchantWithShop({ shopName: 'Noodle House' })
    const res = await api().get('/api/shops').query({ search: '%' })
    expect(res.body).toEqual([])
  })
})

describe('GET /api/shops/:id', () => {
  test('shop detail includes all products of that shop', async () => {
    const { shop } = await createMerchantWithShop()
    const other = await createMerchantWithShop()
    await db.insert(products).values([
      { shopId: shop.id, name: 'Pad Thai', description: 'd', price: 45.5, status: 'available' },
      { shopId: shop.id, name: 'Soup', description: 'd', price: 30 },
      { shopId: other.shop.id, name: 'Other', description: 'd', price: 10 },
    ])
    const res = await api().get(`/api/shops/${String(shop.id)}`)
    expect(res.status).toBe(200)
    expect(res.body.products).toEqual([
      {
        id: expect.any(Number),
        shopId: shop.id,
        name: 'Pad Thai',
        description: 'd',
        price: 45.5,
        imageUrl: null,
        status: 'available',
      },
      expect.objectContaining({ name: 'Soup', price: 30, status: 'not-available' }),
    ])
  })

  test('non-numeric or negative id is a 400, unknown id is a 404', async () => {
    expect((await api().get('/api/shops/abc')).status).toBe(400)
    expect((await api().get('/api/shops/-1')).status).toBe(400)
    expect((await api().get('/api/shops/999999')).status).toBe(404)
  })
})

describe('PUT /api/shops/:id', () => {
  test('update without image keeps the old image (B3)', async () => {
    const { token } = await merchantToken()
    const created = await postShop(token)
    const res = await api()
      .put(`/api/shops/${String(created.body.id)}`)
      .set(auth(token))
      .field('name', 'Renamed')
      .field('description', 'New text')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ name: 'Renamed', description: 'New text' })
    expect(res.body.imageUrl).toBe(created.body.imageUrl)
  })

  test('update with an image replaces the stored filename', async () => {
    const { token } = await merchantToken()
    const created = await postShop(token)
    const res = await api()
      .put(`/api/shops/${String(created.body.id)}`)
      .set(auth(token))
      .field('name', 'Renamed')
      .field('description', 'New text')
      .attach('image', fixtureImage)
    expect(res.status).toBe(200)
    expect(res.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/)
    expect(res.body.imageUrl).not.toBe(created.body.imageUrl)
  })

  test('other merchant cannot update (403), admin can (200)', async () => {
    const owner = await createMerchantWithShop()
    const intruder = await merchantToken()
    const admin = await createUser({ role: 'admin' })
    const url = `/api/shops/${String(owner.shop.id)}`

    const before = uploadCount()
    const denied = await api()
      .put(url)
      .set(auth(intruder.token))
      .field('name', 'Hijack')
      .field('description', 'x')
      .attach('image', fixtureImage)
    expect(denied.status).toBe(403)
    expect(uploadCount()).toBe(before)

    const allowed = await api()
      .put(url)
      .set(auth(await loginAs(admin)))
      .field('name', 'By admin')
      .field('description', 'x')
    expect(allowed.status).toBe(200)
    expect(allowed.body.name).toBe('By admin')
  })

  test('unknown shop is 404, anonymous is 401', async () => {
    const { token } = await merchantToken()
    const missing = await api()
      .put('/api/shops/999999')
      .set(auth(token))
      .field('name', 'x')
      .field('description', 'y')
    expect(missing.status).toBe(404)
    const anonymous = await api().put('/api/shops/1').field('name', 'x').field('description', 'y')
    expect(anonymous.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  test('/api/auth/me reports shopId after creating a shop', async () => {
    const { token } = await merchantToken()
    const before = await api().get('/api/auth/me').set(auth(token))
    expect(before.body.shopId).toBeNull()
    const created = await postShop(token)
    const after = await api().get('/api/auth/me').set(auth(token))
    expect(after.body.shopId).toBe(created.body.id)
  })
})
