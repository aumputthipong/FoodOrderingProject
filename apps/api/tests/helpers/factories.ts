import path from 'node:path'
import bcrypt from 'bcrypt'
import type { Cart, OrderStatus, ProductStatus, Role } from '@canteen/shared'
import { db } from '../../src/db/client'
import { orderItems, orders, products, shops, users } from '../../src/db/schema'
import { nextQueueNumber } from '../../src/modules/orders/orders.repository'
import { queueDateOf } from '../../src/modules/orders/queue-number'
import { api, auth } from './app'

const DEFAULT_PASSWORD = 'Password123'
let sequence = 0

type UserOverrides = Partial<{ username: string; role: Role; firstName: string; mobile: string }>
export type CreatedUser = { id: number; username: string; password: string; role: Role }

/** A real 1x1 PNG for multipart upload tests. */
export const fixtureImage = path.join(import.meta.dirname, '..', 'fixtures', 'pixel.png')

/** Inserts a user straight into the DB (bcrypt cost 10, default password `Password123`). */
export async function createUser(overrides: UserOverrides = {}): Promise<CreatedUser> {
  sequence += 1
  const username = overrides.username ?? `user${String(sequence).padStart(4, '0')}`
  const role = overrides.role ?? 'customer'
  const [result] = await db.insert(users).values({
    username,
    passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
    firstName: overrides.firstName ?? 'Test',
    lastName: 'User',
    email: `${username}@example.com`,
    mobile: overrides.mobile ?? '0812345678',
    role,
  })
  return { id: result.insertId, username, password: DEFAULT_PASSWORD, role }
}

/** Logs in through the real endpoint and returns the issued token. */
export async function loginAs(user: { username: string; password: string }): Promise<string> {
  const res = await api().post('/api/auth/login').send(user)
  if (res.status !== 200) throw new Error(`loginAs failed: ${res.status} ${res.text}`)
  return (res.body as { token: string }).token
}

/** Creates a merchant, inserts their shop (no image) straight into the DB and logs them in. */
export async function createMerchantWithShop(
  overrides: UserOverrides & { shopName?: string } = {},
): Promise<{ user: CreatedUser; token: string; shop: { id: number } }> {
  const { shopName, ...userOverrides } = overrides
  const user = await createUser({ ...userOverrides, role: userOverrides.role ?? 'merchant' })
  const [result] = await db.insert(shops).values({
    ownerId: user.id,
    name: shopName ?? `Shop of ${user.username}`,
    description: 'Shop description',
  })
  return { user, token: await loginAs(user), shop: { id: result.insertId } }
}

/** Inserts a product straight into the DB; defaults to an available product priced 50. */
export async function createProduct(
  shopId: number,
  overrides: Partial<{ name: string; price: number; status: ProductStatus }> = {},
): Promise<{ id: number; price: number }> {
  sequence += 1
  const price = overrides.price ?? 50
  const [result] = await db.insert(products).values({
    shopId,
    name: overrides.name ?? `Product ${String(sequence)}`,
    description: 'Product description',
    price,
    status: overrides.status ?? 'available',
  })
  return { id: result.insertId, price }
}

/** Replaces the user's cart for `shopId` through the real endpoint and returns the resulting cart. */
export async function addToCart(
  token: string,
  shopId: number,
  items: { productId: number; quantity: number }[],
): Promise<Cart> {
  const res = await api()
    .put(`/api/cart/shops/${String(shopId)}/items`)
    .set(auth(token))
    .send({ items })
  if (res.status !== 200) throw new Error(`addToCart failed: ${String(res.status)} ${res.text}`)
  return res.body as Cart
}

/**
 * Inserts an order with its items straight into the DB, so tests control status and timestamps.
 * A finished order without an explicit `finishedAt` is finished at `createdAt`.
 */
export async function createOrder(
  customerId: number,
  shopId: number,
  items: { productId: number; quantity: number; unitPrice: number }[],
  opts: { status?: OrderStatus; createdAt?: Date; finishedAt?: Date | null } = {},
): Promise<{ id: number }> {
  const status = opts.status ?? 'waiting'
  const createdAt = opts.createdAt ?? new Date()
  const finishedAt =
    opts.finishedAt !== undefined ? opts.finishedAt : status === 'finished' ? createdAt : null
  const queueDate = queueDateOf(createdAt)
  const queueNumber = await nextQueueNumber(shopId, queueDate)
  const [result] = await db
    .insert(orders)
    .values({ customerId, shopId, queueDate, queueNumber, status, createdAt, finishedAt })
  const id = result.insertId
  if (items.length > 0) {
    await db.insert(orderItems).values(items.map((item) => ({ orderId: id, ...item })))
  }
  return { id }
}
