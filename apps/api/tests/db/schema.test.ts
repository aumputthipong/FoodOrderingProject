import { eq, sql } from 'drizzle-orm'
import { db, withTransaction, type DbClient } from '../../src/db/client'
import { carts, cartItems, products, shops, users } from '../../src/db/schema'

async function insertUserWith(client: DbClient, username = 'user1') {
  const [result] = await client.insert(users).values({
    username,
    passwordHash: 'hash',
    firstName: 'First',
    lastName: 'Last',
    email: `${username}@example.com`,
    mobile: '0812345678',
    role: 'merchant',
  })
  return result.insertId
}

async function insertShop(overrides: { ownerId: number; name?: string }) {
  const [result] = await db.insert(shops).values({
    ownerId: overrides.ownerId,
    name: overrides.name ?? 'Shop',
    description: 'desc',
  })
  return result.insertId
}

async function insertCartItem(overrides: { quantity: number }) {
  const ownerId = await insertUserWith(db, 'owner')
  const customerId = await insertUserWith(db, 'customer')
  const shopId = await insertShop({ ownerId })
  const [product] = await db.insert(products).values({
    shopId,
    name: 'Noodles',
    description: 'tasty',
    price: 40,
  })
  const [cart] = await db.insert(carts).values({ userId: customerId, shopId })
  await db.insert(cartItems).values({
    cartId: cart.insertId,
    productId: product.insertId,
    quantity: overrides.quantity,
  })
}

async function listTables(): Promise<string[]> {
  const [rows] = (await db.execute(
    sql`SELECT table_name AS table_name FROM information_schema.tables WHERE table_schema = DATABASE()`,
  )) as unknown as [{ table_name: string }[], unknown]
  return rows.map((row) => row.table_name)
}

async function getShop(id: number) {
  const [row] = await db.select().from(shops).where(eq(shops.id, id))
  if (!row) throw new Error('shop not found')
  return row
}

async function countUsers() {
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(users)
  return Number(row?.count ?? 0)
}

test('creates exactly the expected tables', async () => {
  const names = await listTables()
  expect(names.sort()).toEqual([
    '__drizzle_migrations',
    'auth_tokens',
    'cart_items',
    'carts',
    'order_items',
    'orders',
    'products',
    'shops',
    'users',
  ])
})

test('rejects cart item quantity below 1', async () => {
  await expect(insertCartItem({ quantity: 0 })).rejects.toThrow()
})

test('allows only one shop per owner', async () => {
  const ownerId = await insertUserWith(db)
  await insertShop({ ownerId })
  // drizzle wraps driver errors in DrizzleQueryError; the MySQL message is on `cause`
  const error = await insertShop({ ownerId }).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(Error)
  expect((error as Error).cause).toMatchObject({
    code: 'ER_DUP_ENTRY',
    message: expect.stringMatching(/Duplicate/),
  })
})

test('stores Thai text and emoji intact', async () => {
  const ownerId = await insertUserWith(db)
  const id = await insertShop({ ownerId, name: 'ร้านป้า 🍜' })
  expect((await getShop(id)).name).toBe('ร้านป้า 🍜')
})

test('withTransaction rolls back when the callback throws', async () => {
  await expect(
    withTransaction(async (tx) => {
      await insertUserWith(tx)
      throw new Error('x')
    }),
  ).rejects.toThrow('x')
  expect(await countUsers()).toBe(0)
})
