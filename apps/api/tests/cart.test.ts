import { eq } from 'drizzle-orm'
import { db, withTransaction } from '../src/db/client'
import { cartItems, carts } from '../src/db/schema'
import { deleteCart, findOwnedCartForCheckout } from '../src/modules/cart/cart.service'
import { api, auth } from './helpers/app'
import {
  addToCart,
  createMerchantWithShop,
  createProduct,
  createUser,
  loginAs,
} from './helpers/factories'

async function setup() {
  const { shop } = await createMerchantWithShop()
  const customer = await createUser()
  const token = await loginAs(customer)
  const a = await createProduct(shop.id, { price: 50 })
  const b = await createProduct(shop.id, { price: 55 })
  return { shop, customer, token, a, b }
}

function putCart(token: string, shopId: number, body: object) {
  return api()
    .put(`/api/cart/shops/${String(shopId)}/items`)
    .set(auth(token))
    .send(body)
}

describe('PUT /api/cart/shops/:shopId/items', () => {
  test('replace creates a cart with totals', async () => {
    const { shop, token, a, b } = await setup()
    const cart = await addToCart(token, shop.id, [
      { productId: a.id, quantity: 2 },
      { productId: b.id, quantity: 1 },
    ])
    expect(cart.shop.id).toBe(shop.id)
    expect(cart.items.map((i) => i.subtotal)).toEqual([100, 55])
    expect(cart.items.map((i) => i.price)).toEqual([50, 55])
    expect(cart.items.map((i) => i.productId)).toEqual([a.id, b.id])
    expect(cart.totalPrice).toBe(155)
  })

  test('rounds money to 2 decimals', async () => {
    const { shop, token } = await setup()
    const p = await createProduct(shop.id, { price: 0.1 })
    const q = await createProduct(shop.id, { price: 0.2 })
    const cart = await addToCart(token, shop.id, [
      { productId: p.id, quantity: 3 },
      { productId: q.id, quantity: 1 },
    ])
    expect(cart.items.map((i) => i.subtotal)).toEqual([0.3, 0.2])
    expect(cart.totalPrice).toBe(0.5)
  })

  test('replace overwrites previous items; empty list deletes the cart (204)', async () => {
    const { shop, customer, token, a, b } = await setup()
    await addToCart(token, shop.id, [{ productId: a.id, quantity: 2 }])
    const second = await addToCart(token, shop.id, [{ productId: b.id, quantity: 3 }])
    expect(second.items).toHaveLength(1)
    expect(second.items[0]).toMatchObject({ productId: b.id, quantity: 3, subtotal: 165 })
    expect(second.totalPrice).toBe(165)
    expect(await db.select().from(carts).where(eq(carts.userId, customer.id))).toHaveLength(1)

    const res = await putCart(token, shop.id, { items: [] })
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect(await db.select().from(carts)).toHaveLength(0)
    expect(await db.select().from(cartItems)).toHaveLength(0)
    expect((await api().get('/api/cart').set(auth(token))).body).toEqual([])
  })

  test('empty list for a shop without a cart is a harmless 204', async () => {
    const { shop, token } = await setup()
    expect((await putCart(token, shop.id, { items: [] })).status).toBe(204)
  })

  test('rejects products from another shop, unavailable or unknown products (400)', async () => {
    const { shop, token, a } = await setup()
    const other = await createMerchantWithShop()
    const foreign = await createProduct(other.shop.id)
    const hidden = await createProduct(shop.id, { status: 'not-available' })

    for (const productId of [foreign.id, hidden.id, 999_999]) {
      const res = await putCart(token, shop.id, {
        items: [
          { productId: a.id, quantity: 1 },
          { productId, quantity: 1 },
        ],
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'items' }))
    }
    expect(await db.select().from(carts)).toHaveLength(0)
  })

  test('a failed replace leaves the existing cart untouched', async () => {
    const { shop, token, a } = await setup()
    await addToCart(token, shop.id, [{ productId: a.id, quantity: 2 }])
    const res = await putCart(token, shop.id, { items: [{ productId: 999_999, quantity: 1 }] })
    expect(res.status).toBe(400)
    const rows = await db.select().from(cartItems)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ productId: a.id, quantity: 2 })
  })

  test('duplicate productId is a 400, not a 500', async () => {
    const { shop, token, a } = await setup()
    const res = await putCart(token, shop.id, {
      items: [
        { productId: a.id, quantity: 1 },
        { productId: a.id, quantity: 2 },
      ],
    })
    expect(res.status).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'items' }))
  })

  test.each([[0], [100], [1.5]])('quantity %s is a 400', async (quantity) => {
    const { shop, token, a } = await setup()
    const res = await putCart(token, shop.id, { items: [{ productId: a.id, quantity }] })
    expect(res.status).toBe(400)
  })

  test('each customer has their own cart per shop', async () => {
    const { shop, token, a } = await setup()
    const other = await loginAs(await createUser())
    await addToCart(token, shop.id, [{ productId: a.id, quantity: 1 }])
    await addToCart(other, shop.id, [{ productId: a.id, quantity: 5 }])
    expect(await db.select().from(carts)).toHaveLength(2)
    const mine = await api().get('/api/cart').set(auth(token))
    expect(mine.body).toHaveLength(1)
    expect(mine.body[0].items[0].quantity).toBe(1)
  })
})

describe('GET /api/cart', () => {
  test('GET ?shopId filters to that shop', async () => {
    const { shop, token, a } = await setup()
    const other = await createMerchantWithShop()
    const c = await createProduct(other.shop.id, { price: 20 })
    const first = await addToCart(token, shop.id, [{ productId: a.id, quantity: 1 }])
    const second = await addToCart(token, other.shop.id, [{ productId: c.id, quantity: 2 }])

    const all = await api().get('/api/cart').set(auth(token))
    expect(all.status).toBe(200)
    expect(all.body.map((x: { id: number }) => x.id)).toEqual([first.id, second.id])

    const filtered = await api()
      .get(`/api/cart?shopId=${String(other.shop.id)}`)
      .set(auth(token))
    expect(filtered.body).toEqual([second])
    expect(filtered.body[0].shop).toMatchObject({ id: other.shop.id, imageUrl: null })

    const none = await api().get('/api/cart?shopId=999999').set(auth(token))
    expect(none.body).toEqual([])
  })

  test('a non-numeric shopId is a 400', async () => {
    const { token } = await setup()
    expect((await api().get('/api/cart?shopId=abc').set(auth(token))).status).toBe(400)
  })

  test("does not list another user's carts", async () => {
    const { shop, a } = await setup()
    const other = await loginAs(await createUser())
    await addToCart(other, shop.id, [{ productId: a.id, quantity: 1 }])
    const stranger = await loginAs(await createUser())
    expect((await api().get('/api/cart').set(auth(stranger))).body).toEqual([])
  })
})

describe('PATCH /api/cart/items/:id', () => {
  test('PATCH quantity updates subtotal; quantity 0 is 400 (B6)', async () => {
    const { shop, token, a } = await setup()
    const cart = await addToCart(token, shop.id, [{ productId: a.id, quantity: 2 }])
    const itemId = cart.items[0]!.id

    const ok = await api()
      .patch(`/api/cart/items/${String(itemId)}`)
      .set(auth(token))
      .send({ quantity: 5 })
    expect(ok.status).toBe(200)
    expect(ok.body).toMatchObject({ id: itemId, productId: a.id, quantity: 5, subtotal: 250 })

    for (const quantity of [0, -1, 100]) {
      const bad = await api()
        .patch(`/api/cart/items/${String(itemId)}`)
        .set(auth(token))
        .send({ quantity })
      expect(bad.status).toBe(400)
      expect(bad.body.error.details).toContainEqual(expect.objectContaining({ path: 'quantity' }))
    }
    const [row] = await db.select().from(cartItems)
    expect(row?.quantity).toBe(5)
  })

  test("cannot touch another user's cart item: PATCH/DELETE → 404 (B6)", async () => {
    const { shop, token, a } = await setup()
    const cart = await addToCart(token, shop.id, [{ productId: a.id, quantity: 2 }])
    const itemId = cart.items[0]!.id
    const stranger = await loginAs(await createUser())

    const patch = await api()
      .patch(`/api/cart/items/${String(itemId)}`)
      .set(auth(stranger))
      .send({ quantity: 9 })
    expect(patch.status).toBe(404)
    const del = await api()
      .delete(`/api/cart/items/${String(itemId)}`)
      .set(auth(stranger))
    expect(del.status).toBe(404)

    const [row] = await db.select().from(cartItems)
    expect(row?.quantity).toBe(2)
  })

  test('unknown item is 404', async () => {
    const { token } = await setup()
    const res = await api().patch('/api/cart/items/999999').set(auth(token)).send({ quantity: 1 })
    expect(res.status).toBe(404)
    expect((await api().delete('/api/cart/items/999999').set(auth(token))).status).toBe(404)
  })
})

describe('DELETE /api/cart/items/:id', () => {
  test('deleting the last item removes the cart; DELETE returns empty 204 (B7)', async () => {
    const { shop, token, a } = await setup()
    const cart = await addToCart(token, shop.id, [{ productId: a.id, quantity: 1 }])
    const itemId = cart.items[0]!.id
    const res = await api()
      .delete(`/api/cart/items/${String(itemId)}`)
      .set(auth(token))
    expect(res.status).toBe(204)
    expect(res.text).toBe('')
    expect((await api().get('/api/cart').set(auth(token))).body).toEqual([])
    expect(await db.select().from(carts)).toHaveLength(0)
  })

  test('deleting one of several items keeps the cart', async () => {
    const { shop, token, a, b } = await setup()
    const cart = await addToCart(token, shop.id, [
      { productId: a.id, quantity: 1 },
      { productId: b.id, quantity: 2 },
    ])
    const res = await api()
      .delete(`/api/cart/items/${String(cart.items[0]!.id)}`)
      .set(auth(token))
    expect(res.status).toBe(204)
    const after = await api().get('/api/cart').set(auth(token))
    expect(after.body).toHaveLength(1)
    expect(after.body[0].items.map((i: { productId: number }) => i.productId)).toEqual([b.id])
    expect(after.body[0].totalPrice).toBe(110)
  })
})

describe('authentication', () => {
  test('requires authentication', async () => {
    expect((await api().get('/api/cart')).status).toBe(401)
    expect((await api().put('/api/cart/shops/1/items').send({ items: [] })).status).toBe(401)
    expect((await api().patch('/api/cart/items/1').send({ quantity: 1 })).status).toBe(401)
    expect((await api().delete('/api/cart/items/1')).status).toBe(401)
  })
})

describe('checkout helpers', () => {
  test('findOwnedCartForCheckout returns the cart with current prices and statuses', async () => {
    const { shop, customer, token, a, b } = await setup()
    const cart = await addToCart(token, shop.id, [
      { productId: a.id, quantity: 2 },
      { productId: b.id, quantity: 1 },
    ])
    const found = await withTransaction((tx) => findOwnedCartForCheckout(customer.id, cart.id, tx))
    expect(found).toEqual({
      id: cart.id,
      shopId: shop.id,
      items: [
        { productId: a.id, quantity: 2, price: 50, status: 'available' },
        { productId: b.id, quantity: 1, price: 55, status: 'available' },
      ],
    })
  })

  test('findOwnedCartForCheckout is null for unknown or foreign carts', async () => {
    const { shop, token, a } = await setup()
    const cart = await addToCart(token, shop.id, [{ productId: a.id, quantity: 1 }])
    const stranger = await createUser()
    expect(await withTransaction((tx) => findOwnedCartForCheckout(stranger.id, cart.id, tx))).toBe(
      null,
    )
    expect(await withTransaction((tx) => findOwnedCartForCheckout(stranger.id, 999_999, tx))).toBe(
      null,
    )
  })

  test('findOwnedCartForCheckout locks the cart until the transaction ends', async () => {
    const { shop, customer, token, a } = await setup()
    const cart = await addToCart(token, shop.id, [{ productId: a.id, quantity: 1 }])
    let committed = false
    let concurrent: ReturnType<typeof patchQuantity> | undefined
    function patchQuantity() {
      return api()
        .patch(`/api/cart/items/${String(cart.items[0]!.id)}`)
        .set(auth(token))
        .send({ quantity: 7 })
        .then((res) => ({ res, committedWhenDone: committed }))
    }

    await withTransaction(async (tx) => {
      await findOwnedCartForCheckout(customer.id, cart.id, tx)
      // Start a concurrent writer; it must block on the row lock until this tx ends.
      concurrent = patchQuantity()
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    committed = true
    const outcome = await concurrent
    expect(outcome?.res.status).toBe(200)
    expect(outcome?.committedWhenDone).toBe(true)
  })

  test('deleteCart removes the cart and its items', async () => {
    const { shop, token, a, b } = await setup()
    const cart = await addToCart(token, shop.id, [
      { productId: a.id, quantity: 1 },
      { productId: b.id, quantity: 1 },
    ])
    await withTransaction((tx) => deleteCart(cart.id, tx))
    expect(await db.select().from(carts)).toHaveLength(0)
    expect(await db.select().from(cartItems)).toHaveLength(0)
  })
})
