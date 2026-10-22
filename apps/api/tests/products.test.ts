import fs from 'node:fs'
import { env } from '../src/config/env'
import { db } from '../src/db/client'
import { products } from '../src/db/schema'
import { findProductsForCart } from '../src/modules/products/products.service'
import { api, auth } from './helpers/app'
import {
  createMerchantWithShop,
  createProduct,
  createUser,
  fixtureImage,
  loginAs,
} from './helpers/factories'

function uploadCount(): number {
  return fs.existsSync(env.UPLOAD_DIR) ? fs.readdirSync(env.UPLOAD_DIR).length : 0
}

function postProduct(token: string, shopId: number, fields: Record<string, string> = {}) {
  const values = { name: 'ข้าวผัด', description: 'โบราณ', price: '45.50', ...fields }
  return api()
    .post(`/api/shops/${String(shopId)}/products`)
    .set(auth(token))
    .field('name', values.name)
    .field('description', values.description)
    .field('price', values.price)
    .attach('image', fixtureImage)
}

describe('POST /api/shops/:shopId/products', () => {
  test('owner adds a product; defaults to not-available; price is a number', async () => {
    const { token, shop } = await createMerchantWithShop()
    const res = await postProduct(token, shop.id)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      shopId: shop.id,
      name: 'ข้าวผัด',
      description: 'โบราณ',
      price: 45.5,
      status: 'not-available',
    })
    expect(res.body.imageUrl).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/)
  })

  test.each([['-1'], ['0'], ['abc']])('rejects price %s on path price', async (price) => {
    const { token, shop } = await createMerchantWithShop()
    const before = uploadCount()
    const res = await postProduct(token, shop.id, { price })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'price' }))
    expect(await db.select().from(products)).toHaveLength(0)
    expect(uploadCount()).toBe(before)
  })

  test('missing image is a validation error on path image', async () => {
    const { token, shop } = await createMerchantWithShop()
    const res = await api()
      .post(`/api/shops/${String(shop.id)}/products`)
      .set(auth(token))
      .field('name', 'x')
      .field('description', 'y')
      .field('price', '10')
    expect(res.status).toBe(400)
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'image' }))
  })

  test('unknown shop is 404, anonymous is 401', async () => {
    const { token } = await createMerchantWithShop()
    const before = uploadCount()
    const missing = await postProduct(token, 999999)
    expect(missing.status).toBe(404)
    expect(missing.body.error.code).toBe('NOT_FOUND')
    expect(uploadCount()).toBe(before)
    const anonymous = await api().post('/api/shops/1/products').field('name', 'x')
    expect(anonymous.status).toBe(401)
  })
})

describe('ownership (B4)', () => {
  test('other merchant cannot add, update or change status', async () => {
    const owner = await createMerchantWithShop()
    const intruder = await createMerchantWithShop()
    const product = await createProduct(owner.shop.id, { name: 'Original' })
    const before = uploadCount()

    const add = await postProduct(intruder.token, owner.shop.id)
    expect(add.status).toBe(403)

    const update = await api()
      .put(`/api/products/${String(product.id)}`)
      .set(auth(intruder.token))
      .field('name', 'Hijack')
      .field('description', 'x')
      .field('price', '1')
      .attach('image', fixtureImage)
    expect(update.status).toBe(403)

    const status = await api()
      .patch(`/api/products/${String(product.id)}/status`)
      .set(auth(intruder.token))
      .send({ status: 'not-available' })
    expect(status.status).toBe(403)

    const [row] = await db.select().from(products)
    expect(row).toMatchObject({ name: 'Original', status: 'available' })
    expect(await db.select().from(products)).toHaveLength(1)
    expect(uploadCount()).toBe(before)
  })

  test('admin can manage any shop product', async () => {
    const owner = await createMerchantWithShop()
    const admin = await createUser({ role: 'admin' })
    const res = await postProduct(await loginAs(admin), owner.shop.id)
    expect(res.status).toBe(201)
  })
})

describe('PUT /api/products/:id', () => {
  test('update uses the shared field names and keeps image when omitted (B2, B3)', async () => {
    const { token, shop } = await createMerchantWithShop()
    const created = await postProduct(token, shop.id)
    const res = await api()
      .put(`/api/products/${String(created.body.id)}`)
      .set(auth(token))
      .field('name', 'Renamed')
      .field('description', 'New text')
      .field('price', '60')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: created.body.id,
      name: 'Renamed',
      description: 'New text',
      price: 60,
      status: 'not-available',
    })
    expect(res.body.imageUrl).toBe(created.body.imageUrl)
  })

  test('update with an image replaces the stored filename', async () => {
    const { token, shop } = await createMerchantWithShop()
    const created = await postProduct(token, shop.id)
    const res = await api()
      .put(`/api/products/${String(created.body.id)}`)
      .set(auth(token))
      .field('name', 'Renamed')
      .field('description', 'New text')
      .field('price', '60')
      .attach('image', fixtureImage)
    expect(res.status).toBe(200)
    expect(res.body.imageUrl).not.toBe(created.body.imageUrl)
  })

  test('invalid price is 400; unknown product is 404', async () => {
    const { token, shop } = await createMerchantWithShop()
    const product = await createProduct(shop.id)
    const invalid = await api()
      .put(`/api/products/${String(product.id)}`)
      .set(auth(token))
      .field('name', 'x')
      .field('description', 'y')
      .field('price', '-5')
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.details).toContainEqual(expect.objectContaining({ path: 'price' }))
    const missing = await api()
      .put('/api/products/999999')
      .set(auth(token))
      .field('name', 'x')
      .field('description', 'y')
      .field('price', '5')
    expect(missing.status).toBe(404)
  })
})

describe('PATCH /api/products/:id/status', () => {
  test('status toggles and rejects unknown values', async () => {
    const { token, shop } = await createMerchantWithShop()
    const product = await createProduct(shop.id, { status: 'not-available' })
    const url = `/api/products/${String(product.id)}/status`

    const on = await api().patch(url).set(auth(token)).send({ status: 'available' })
    expect(on.status).toBe(200)
    expect(on.body).toMatchObject({ id: product.id, status: 'available' })

    const off = await api().patch(url).set(auth(token)).send({ status: 'not-available' })
    expect(off.status).toBe(200)
    expect(off.body.status).toBe('not-available')

    const bad = await api().patch(url).set(auth(token)).send({ status: 'sold-out' })
    expect(bad.status).toBe(400)
    expect(bad.body.error.details).toContainEqual(expect.objectContaining({ path: 'status' }))
  })

  test('unknown product is 404, anonymous is 401', async () => {
    const { token } = await createMerchantWithShop()
    const missing = await api()
      .patch('/api/products/999999/status')
      .set(auth(token))
      .send({ status: 'available' })
    expect(missing.status).toBe(404)
    const anonymous = await api().patch('/api/products/1/status').send({ status: 'available' })
    expect(anonymous.status).toBe(401)
  })
})

describe('shop detail', () => {
  test('shop detail reflects product changes', async () => {
    const { token, shop } = await createMerchantWithShop()
    const created = await postProduct(token, shop.id)
    const url = `/api/shops/${String(shop.id)}`

    let detail = await api().get(url)
    expect(detail.body.products).toEqual([created.body])

    await api()
      .patch(`/api/products/${String(created.body.id)}/status`)
      .set(auth(token))
      .send({ status: 'available' })
    await api()
      .put(`/api/products/${String(created.body.id)}`)
      .set(auth(token))
      .field('name', 'Renamed')
      .field('description', 'd')
      .field('price', '12.25')

    detail = await api().get(url)
    expect(detail.body.products).toEqual([
      { ...created.body, name: 'Renamed', description: 'd', price: 12.25, status: 'available' },
    ])
  })
})

describe('findProductsForCart', () => {
  test('returns only rows of that shop whose id is requested, any status', async () => {
    const a = await createMerchantWithShop()
    const b = await createMerchantWithShop()
    const p1 = await createProduct(a.shop.id)
    const p2 = await createProduct(a.shop.id, { status: 'not-available' })
    await createProduct(a.shop.id)
    const foreign = await createProduct(b.shop.id)

    const rows = await findProductsForCart(a.shop.id, [p1.id, p2.id, foreign.id])
    expect(rows.map((r) => r.id).sort()).toEqual([p1.id, p2.id].sort())
    expect(await findProductsForCart(a.shop.id, [])).toEqual([])
  })
})
