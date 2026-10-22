import { and, asc, count, eq, inArray, sql } from 'drizzle-orm'
import { db, type DbClient } from '../../db/client'
import { cartItems, carts, products, shops } from '../../db/schema'

export type CartWithShopRow = {
  id: number
  shopId: number
  shopName: string
  shopImageFilename: string | null
}

export type CartItemRow = {
  id: number
  cartId: number
  productId: number
  name: string
  imageFilename: string | null
  price: number
  quantity: number
}

export type OwnedItemRow = { id: number; cartId: number; productId: number; quantity: number }

export type NewCartItemValues = { productId: number; quantity: number }

const cartWithShopColumns = {
  id: carts.id,
  shopId: carts.shopId,
  shopName: shops.name,
  shopImageFilename: shops.imageFilename,
}

const cartItemColumns = {
  id: cartItems.id,
  cartId: cartItems.cartId,
  productId: cartItems.productId,
  name: products.name,
  imageFilename: products.imageFilename,
  price: products.price,
  quantity: cartItems.quantity,
}

/** The user's carts (optionally of one shop) with their shop, ordered by cart id. */
export async function findCartsByUser(
  userId: number,
  shopId?: number,
  client: DbClient = db,
): Promise<CartWithShopRow[]> {
  return client
    .select(cartWithShopColumns)
    .from(carts)
    .innerJoin(shops, eq(shops.id, carts.shopId))
    .where(
      and(eq(carts.userId, userId), shopId === undefined ? undefined : eq(carts.shopId, shopId)),
    )
    .orderBy(asc(carts.id))
}

export async function findCartWithShopById(
  cartId: number,
  client: DbClient = db,
): Promise<CartWithShopRow | null> {
  const rows = await client
    .select(cartWithShopColumns)
    .from(carts)
    .innerJoin(shops, eq(shops.id, carts.shopId))
    .where(eq(carts.id, cartId))
    .limit(1)
  return rows[0] ?? null
}

/** Items of the given carts joined with their product, ordered by item id. */
export async function findItemsByCartIds(
  cartIds: number[],
  client: DbClient = db,
): Promise<CartItemRow[]> {
  if (cartIds.length === 0) return []
  return client
    .select(cartItemColumns)
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(inArray(cartItems.cartId, cartIds))
    .orderBy(asc(cartItems.id))
}

export async function findItemWithProductById(
  itemId: number,
  client: DbClient = db,
): Promise<CartItemRow | null> {
  const rows = await client
    .select(cartItemColumns)
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.id, itemId))
    .limit(1)
  return rows[0] ?? null
}

/** The item, only if its cart belongs to `userId`. */
export async function findOwnedItem(
  userId: number,
  itemId: number,
  client: DbClient = db,
): Promise<OwnedItemRow | null> {
  const rows = await client
    .select({
      id: cartItems.id,
      cartId: cartItems.cartId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .innerJoin(carts, eq(carts.id, cartItems.cartId))
    .where(and(eq(cartItems.id, itemId), eq(carts.userId, userId)))
    .limit(1)
  return rows[0] ?? null
}

/** The cart row of `userId` locked with `FOR UPDATE`; null if absent or owned by someone else. */
export async function lockOwnedCart(
  userId: number,
  cartId: number,
  client: DbClient = db,
): Promise<{ id: number; shopId: number } | null> {
  const rows = await client
    .select({ id: carts.id, shopId: carts.shopId })
    .from(carts)
    .where(and(eq(carts.id, cartId), eq(carts.userId, userId)))
    .limit(1)
    .for('update')
  return rows[0] ?? null
}

/** Raw items of a cart, locked with `FOR UPDATE`, ordered by item id. */
export async function lockItemsByCartId(
  cartId: number,
  client: DbClient = db,
): Promise<OwnedItemRow[]> {
  return client
    .select({
      id: cartItems.id,
      cartId: cartItems.cartId,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId))
    .orderBy(asc(cartItems.id))
    .for('update')
}

/** Creates the user's cart for the shop if missing (touching it otherwise) and returns its id. */
export async function upsertCart(
  userId: number,
  shopId: number,
  client: DbClient = db,
): Promise<number> {
  const [result] = await client
    .insert(carts)
    .values({ userId, shopId })
    .onDuplicateKeyUpdate({ set: { id: sql`LAST_INSERT_ID(${carts.id})`, updatedAt: sql`NOW()` } })
  return result.insertId
}

export async function insertItems(
  cartId: number,
  items: NewCartItemValues[],
  client: DbClient = db,
): Promise<void> {
  if (items.length === 0) return
  await client.insert(cartItems).values(items.map((item) => ({ cartId, ...item })))
}

export async function deleteItemsByCartId(cartId: number, client: DbClient = db): Promise<void> {
  await client.delete(cartItems).where(eq(cartItems.cartId, cartId))
}

export async function updateItemQuantity(
  itemId: number,
  quantity: number,
  client: DbClient = db,
): Promise<void> {
  await client.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId))
}

export async function deleteItem(itemId: number, client: DbClient = db): Promise<void> {
  await client.delete(cartItems).where(eq(cartItems.id, itemId))
}

export async function countItems(cartId: number, client: DbClient = db): Promise<number> {
  const [row] = await client
    .select({ total: count() })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId))
  return row?.total ?? 0
}

/** Deletes the cart (its items go with it via ON DELETE CASCADE). */
export async function deleteCart(cartId: number, client: DbClient = db): Promise<void> {
  await client.delete(carts).where(eq(carts.id, cartId))
}

export async function deleteCartByUserAndShop(
  userId: number,
  shopId: number,
  client: DbClient = db,
): Promise<void> {
  await client.delete(carts).where(and(eq(carts.userId, userId), eq(carts.shopId, shopId)))
}
