import { eq } from 'drizzle-orm'
import type { Order, ShopOrder } from '@canteen/shared'
import { db } from '../src/db/client'
import { carts, orderItems, orders, products } from '../src/db/schema'
import { api, auth } from './helpers/app'
import {
  addToCart,
  createMerchantWithShop,
  createOrder,
  createProduct,
  createUser,
  loginAs,
} from './helpers/factories'

async function setup() {
  const merchant = await createMerchantWithShop()
  const customer = await createUser({ firstName: 'Somchai', mobile: '0899999999' })
  const token = await loginAs(customer)
  const a = await createProduct(merchant.shop.id, { price: 50 })
  const b = await createProduct(merchant.shop.id, { price: 55 })
  return { merchant, customer, token, a, b }
}

async function setupWithCart() {
  const ctx = await setup()
  const cart = await addToCart(ctx.token, ctx.merchant.shop.id, [
    { productId: ctx.a.id, quantity: 2 },
    { productId: ctx.b.id, quantity: 1 },
  ])
  return { ...ctx, cart }
}

function checkout(token: string, cartId: number) {
  return api().post('/api/orders').set(auth(token)).send({ cartId })
}

const day = (n: number) => new Date(Date.UTC(2026, 0, n, 12, 0, 0))

describe('POST /api/orders', () => {
  test('checkout creates an order with price snapshot and removes the cart', async () => {
    const { merchant, token, cart, a, b } = await setupWithCart()
    const res = await checkout(token, cart.id)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      status: 'waiting',
      totalPrice: 155,
      finishedAt: null,
      shop: { id: merchant.shop.id },
    })
    expect(typeof res.body.createdAt).toBe('string')
    expect(res.body.items).toHaveLength(2)
    expect(res.body.items[0]).toMatchObject({
      productId: a.id,
      unitPrice: 50,
      quantity: 2,
      isDone: false,
    })
    expect(res.body.items[1]).toMatchObject({ productId: b.id, unitPrice: 55, quantity: 1 })
    expect((await api().get('/api/cart').set(auth(token))).body).toEqual([])
    expect(await db.select().from(carts)).toHaveLength(0)
  })

  test('order history keeps the price paid after the shop changes prices (B13)', async () => {
    const { merchant, token, cart, a } = await setupWithCart()
    const created = await checkout(token, cart.id)
    await db.update(products).set({ price: 999 }).where(eq(products.id, a.id))

    const mine = await api().get('/api/orders/mine').set(auth(token))
    const order = (mine.body as { waiting: Order[] }).waiting[0]
    expect(order?.id).toBe(created.body.id)
    expect(order?.totalPrice).toBe(155)
    expect(order?.items[0]).toMatchObject({ productId: a.id, unitPrice: 50 })

    const shopSide = await api().get('/api/shops/mine/orders').set(auth(merchant.token))
    expect(shopSide.body.waiting[0].items[0].unitPrice).toBe(50)
  })

  test("checkout with someone else's or an unknown cart is 404 (B5)", async () => {
    const { cart } = await setupWithCart()
    const stranger = await loginAs(await createUser())
    const other = await checkout(stranger, cart.id)
    expect(other.status).toBe(404)
    expect((await checkout(stranger, 999999)).status).toBe(404)
    expect(await db.select().from(orders)).toHaveLength(0)
    expect(await db.select().from(carts)).toHaveLength(1)
  })

  test('checking out the same cart twice yields 404 and a single order', async () => {
    const { token, cart } = await setupWithCart()
    const first = await checkout(token, cart.id)
    const second = await checkout(token, cart.id)
    expect(first.status).toBe(201)
    expect(second.status).toBe(404)
    expect(await db.select().from(orders)).toHaveLength(1)
    expect(await db.select().from(orderItems)).toHaveLength(2)
  })

  test('concurrent checkouts of the same cart create exactly one order', async () => {
    const { token, cart } = await setupWithCart()
    const results = await Promise.all([checkout(token, cart.id), checkout(token, cart.id)])
    expect(results.map((r) => r.status).sort()).toEqual([201, 404])
    expect(await db.select().from(orders)).toHaveLength(1)
  })

  test('checkout fails with 400 when a product became unavailable, cart kept', async () => {
    const { token, cart, b } = await setupWithCart()
    await db.update(products).set({ status: 'not-available' }).where(eq(products.id, b.id))
    const res = await checkout(token, cart.id)
    expect(res.status).toBe(400)
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'cartId' }))
    expect(await db.select().from(orders)).toHaveLength(0)
    expect(await db.select().from(orderItems)).toHaveLength(0)
    expect(await db.select().from(carts)).toHaveLength(1)
    expect((await api().get('/api/cart').set(auth(token))).body).toHaveLength(1)
  })

  test('checkout of a cart with no items is 400', async () => {
    const { merchant, customer, token } = await setup()
    const [result] = await db
      .insert(carts)
      .values({ userId: customer.id, shopId: merchant.shop.id })
    const res = await checkout(token, result.insertId)
    expect(res.status).toBe(400)
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'cartId' }))
    expect(await db.select().from(orders)).toHaveLength(0)
  })

  test('rejects an invalid body and unauthenticated requests', async () => {
    const { token } = await setup()
    for (const body of [{}, { cartId: 0 }, { cartId: 'x' }, { cartId: 1.5 }]) {
      const res = await api().post('/api/orders').set(auth(token)).send(body)
      expect(res.status).toBe(400)
    }
    expect((await api().post('/api/orders').send({ cartId: 1 })).status).toBe(401)
  })
})

describe('GET /api/orders/mine', () => {
  test('my orders: waiting oldest first, finished newest first; only my own', async () => {
    const { merchant, customer, token, a } = await setup()
    const items = [{ productId: a.id, quantity: 1, unitPrice: 50 }]
    const w2 = await createOrder(customer.id, merchant.shop.id, items, { createdAt: day(2) })
    const w1 = await createOrder(customer.id, merchant.shop.id, items, { createdAt: day(1) })
    const f1 = await createOrder(customer.id, merchant.shop.id, items, {
      status: 'finished',
      createdAt: day(3),
    })
    const f2 = await createOrder(customer.id, merchant.shop.id, items, {
      status: 'finished',
      createdAt: day(4),
    })
    const stranger = await createUser()
    await createOrder(stranger.id, merchant.shop.id, items, { createdAt: day(5) })

    const res = await api().get('/api/orders/mine').set(auth(token))
    expect(res.status).toBe(200)
    expect((res.body.waiting as Order[]).map((o) => o.id)).toEqual([w1.id, w2.id])
    expect((res.body.finished as Order[]).map((o) => o.id)).toEqual([f2.id, f1.id])
    expect(res.body.waiting[0]).toMatchObject({
      status: 'waiting',
      finishedAt: null,
      totalPrice: 50,
    })
    expect(typeof res.body.finished[0].finishedAt).toBe('string')
    expect(res.body.waiting[0].shop).toEqual({ id: merchant.shop.id, name: expect.any(String) })
    expect(res.body.waiting[0].customer).toBeUndefined()
  })

  test('is empty for a user without orders; requires authentication', async () => {
    const { token } = await setup()
    const res = await api().get('/api/orders/mine').set(auth(token))
    expect(res.body).toEqual({ waiting: [], finished: [] })
    expect((await api().get('/api/orders/mine')).status).toBe(401)
  })
})

describe('GET /api/shops/mine/orders', () => {
  test('shop orders include customer contact; only own shop', async () => {
    const { merchant, customer, a } = await setup()
    const items = [{ productId: a.id, quantity: 2, unitPrice: 50 }]
    const mine = await createOrder(customer.id, merchant.shop.id, items, { createdAt: day(1) })
    const finished = await createOrder(customer.id, merchant.shop.id, items, {
      status: 'finished',
      createdAt: day(2),
    })

    const otherMerchant = await createMerchantWithShop()
    const otherProduct = await createProduct(otherMerchant.shop.id)
    await createOrder(
      customer.id,
      otherMerchant.shop.id,
      [{ productId: otherProduct.id, quantity: 1, unitPrice: 50 }],
      { createdAt: day(3) },
    )

    const res = await api().get('/api/shops/mine/orders').set(auth(merchant.token))
    expect(res.status).toBe(200)
    const waiting = res.body.waiting as ShopOrder[]
    expect(waiting.map((o) => o.id)).toEqual([mine.id])
    expect(waiting[0]?.customer).toEqual({
      id: customer.id,
      firstName: 'Somchai',
      mobile: '0899999999',
    })
    expect(waiting[0]?.totalPrice).toBe(100)
    expect((res.body.finished as ShopOrder[]).map((o) => o.id)).toEqual([finished.id])
  })

  test('shop orders are ordered waiting oldest first, finished newest first', async () => {
    const { merchant, customer, a } = await setup()
    const items = [{ productId: a.id, quantity: 1, unitPrice: 50 }]
    const w2 = await createOrder(customer.id, merchant.shop.id, items, { createdAt: day(2) })
    const w1 = await createOrder(customer.id, merchant.shop.id, items, { createdAt: day(1) })
    const f1 = await createOrder(customer.id, merchant.shop.id, items, {
      status: 'finished',
      createdAt: day(3),
    })
    const f2 = await createOrder(customer.id, merchant.shop.id, items, {
      status: 'finished',
      createdAt: day(4),
    })
    const res = await api().get('/api/shops/mine/orders').set(auth(merchant.token))
    expect((res.body.waiting as ShopOrder[]).map((o) => o.id)).toEqual([w1.id, w2.id])
    expect((res.body.finished as ShopOrder[]).map((o) => o.id)).toEqual([f2.id, f1.id])
  })

  test('merchant without a shop gets 404; customer gets 403', async () => {
    const noShop = await createUser({ role: 'merchant' })
    const noShopToken = await loginAs(noShop)
    expect((await api().get('/api/shops/mine/orders').set(auth(noShopToken))).status).toBe(404)

    const customerToken = await loginAs(await createUser())
    expect((await api().get('/api/shops/mine/orders').set(auth(customerToken))).status).toBe(403)
    expect((await api().get('/api/shops/mine/orders')).status).toBe(401)
  })

  test('/api/shops/:id still works next to /shops/mine/orders', async () => {
    const { merchant } = await setup()
    expect((await api().get(`/api/shops/${String(merchant.shop.id)}`)).status).toBe(200)
  })
})

describe('PATCH /api/orders/:id/status', () => {
  test('finishing sets finishedAt; reopening clears it', async () => {
    const { merchant, customer, a } = await setup()
    const order = await createOrder(customer.id, merchant.shop.id, [
      { productId: a.id, quantity: 2, unitPrice: 50 },
    ])
    const url = `/api/orders/${String(order.id)}/status`

    const done = await api().patch(url).set(auth(merchant.token)).send({ status: 'finished' })
    expect(done.status).toBe(200)
    expect(done.body).toMatchObject({
      id: order.id,
      status: 'finished',
      totalPrice: 100,
      customer: { id: customer.id, firstName: 'Somchai', mobile: '0899999999' },
    })
    expect(new Date(done.body.finishedAt as string).toISOString()).toBe(done.body.finishedAt)

    const reopened = await api().patch(url).set(auth(merchant.token)).send({ status: 'waiting' })
    expect(reopened.status).toBe(200)
    expect(reopened.body).toMatchObject({ status: 'waiting', finishedAt: null })
    const [row] = await db.select().from(orders).where(eq(orders.id, order.id))
    expect(row?.finishedAt).toBeNull()
  })

  test('finishing an already finished order keeps its finishedAt', async () => {
    const { merchant, customer, a } = await setup()
    const order = await createOrder(
      customer.id,
      merchant.shop.id,
      [{ productId: a.id, quantity: 1, unitPrice: 50 }],
      { status: 'finished', createdAt: day(1), finishedAt: day(2) },
    )
    const res = await api()
      .patch(`/api/orders/${String(order.id)}/status`)
      .set(auth(merchant.token))
      .send({ status: 'finished' })
    expect(res.body.finishedAt).toBe(day(2).toISOString())
  })

  test('other merchant cannot change status or items (B4)', async () => {
    const { merchant, customer, a } = await setup()
    const order = await createOrder(customer.id, merchant.shop.id, [
      { productId: a.id, quantity: 2, unitPrice: 50 },
    ])
    const [item] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const intruder = await createMerchantWithShop()

    const status = await api()
      .patch(`/api/orders/${String(order.id)}/status`)
      .set(auth(intruder.token))
      .send({ status: 'finished' })
    expect(status.status).toBe(403)
    const itemRes = await api()
      .patch(`/api/order-items/${String(item?.id)}`)
      .set(auth(intruder.token))
      .send({ isDone: true })
    expect(itemRes.status).toBe(403)

    const customerRes = await api()
      .patch(`/api/orders/${String(order.id)}/status`)
      .set(auth(await loginAs(customer)))
      .send({ status: 'finished' })
    expect(customerRes.status).toBe(403)

    const [row] = await db.select().from(orders).where(eq(orders.id, order.id))
    expect(row?.status).toBe('waiting')
    const [unchanged] = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, item?.id ?? 0))
    expect(unchanged?.isDone).toBe(false)
  })

  test('an admin may change any shop order', async () => {
    const { merchant, customer, a } = await setup()
    const order = await createOrder(customer.id, merchant.shop.id, [
      { productId: a.id, quantity: 1, unitPrice: 50 },
    ])
    const adminToken = await loginAs(await createUser({ role: 'admin' }))
    const res = await api()
      .patch(`/api/orders/${String(order.id)}/status`)
      .set(auth(adminToken))
      .send({ status: 'finished' })
    expect(res.status).toBe(200)
  })

  test('unknown order is 404; invalid body is 400; requires authentication', async () => {
    const { merchant } = await setup()
    const missing = await api()
      .patch('/api/orders/999999/status')
      .set(auth(merchant.token))
      .send({ status: 'finished' })
    expect(missing.status).toBe(404)
    const bad = await api()
      .patch('/api/orders/1/status')
      .set(auth(merchant.token))
      .send({ status: 'cooking' })
    expect(bad.status).toBe(400)
    expect(
      (
        await api()
          .patch('/api/orders/abc/status')
          .set(auth(merchant.token))
          .send({ status: 'waiting' })
      ).status,
    ).toBe(400)
    expect((await api().patch('/api/orders/1/status').send({ status: 'waiting' })).status).toBe(401)
  })
})

describe('PATCH /api/order-items/:id', () => {
  test('toggling an item persists isDone (B10)', async () => {
    const { merchant, customer, a } = await setup()
    const order = await createOrder(customer.id, merchant.shop.id, [
      { productId: a.id, quantity: 2, unitPrice: 50 },
    ])
    const [row] = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id))
    const itemId = row?.id ?? 0

    const res = await api()
      .patch(`/api/order-items/${String(itemId)}`)
      .set(auth(merchant.token))
      .send({ isDone: true })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: itemId,
      productId: a.id,
      unitPrice: 50,
      quantity: 2,
      isDone: true,
      imageUrl: null,
    })
    expect(typeof res.body.name).toBe('string')
    const [after] = await db.select().from(orderItems).where(eq(orderItems.id, itemId))
    expect(after?.isDone).toBe(true)

    const shopSide = await api().get('/api/shops/mine/orders').set(auth(merchant.token))
    expect(shopSide.body.waiting[0].items[0].isDone).toBe(true)

    const off = await api()
      .patch(`/api/order-items/${String(itemId)}`)
      .set(auth(merchant.token))
      .send({ isDone: false })
    expect(off.body.isDone).toBe(false)
  })

  test('unknown item is 404; invalid body is 400', async () => {
    const { merchant } = await setup()
    const missing = await api()
      .patch('/api/order-items/999999')
      .set(auth(merchant.token))
      .send({ isDone: true })
    expect(missing.status).toBe(404)
    const bad = await api()
      .patch('/api/order-items/1')
      .set(auth(merchant.token))
      .send({ isDone: 'yes' })
    expect(bad.status).toBe(400)
    expect((await api().patch('/api/order-items/1').send({ isDone: true })).status).toBe(401)
  })
})
