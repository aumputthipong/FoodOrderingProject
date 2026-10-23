import type { Cart, CartItem, ProductStatus, ReplaceCartItemsInput } from '@canteen/shared'
import { NotFoundError, ValidationError } from '../../common/errors'
import { withTransaction, type DbClient, type Tx } from '../../db/client'
import { findProductsForCart } from '../products/products.service'
import { toCart, toCartItem } from './cart.mapper'
import * as repo from './cart.repository'

const ITEM_NOT_FOUND = 'Cart item not found'

/**
 * Cart writes run at READ COMMITTED. Under REPEATABLE READ the DELETE of a new (still empty)
 * cart's items takes a gap lock on `cart_items(cart_id, ...)` that other carts' transactions
 * share, and their INSERTs then wait on each other: a deadlock on concurrent first add-to-carts.
 * READ COMMITTED takes no such gap locks. Each transaction locks its cart row first
 * (`FOR UPDATE`), so writers of one cart are serialized, and every later read is either a locking
 * (current) read or a plain read that sees what was committed plus the transaction's own writes.
 */
const CART_TX = { isolationLevel: 'read committed' } as const

export type CheckoutCart = {
  id: number
  shopId: number
  items: { productId: number; quantity: number; price: number; status: ProductStatus }[]
}

export async function listCarts(userId: number, shopId?: number): Promise<Cart[]> {
  const cartRows = await repo.findCartsByUser(userId, shopId)
  const itemRows = await repo.findItemsByCartIds(cartRows.map((cart) => cart.id))
  return cartRows.map((cart) =>
    toCart(
      cart,
      itemRows.filter((item) => item.cartId === cart.id),
    ),
  )
}

/**
 * Replaces everything the user has in the cart of `shopId`.
 * Returns the new cart, or `null` when `items` is empty (the cart is deleted).
 */
export async function replaceCartItems(
  userId: number,
  shopId: number,
  items: ReplaceCartItemsInput['items'],
): Promise<Cart | null> {
  if (items.length === 0) {
    await repo.deleteCartByUserAndShop(userId, shopId)
    return null
  }

  return withTransaction(async (tx) => {
    // Lock first: everything below then runs after a concurrent replacement of the same cart has
    // committed, and replaces what it left behind.
    const cartId = await repo.upsertCart(userId, shopId, tx)
    await assertAllAvailable(shopId, items, tx)
    await repo.deleteItemsByCartId(cartId, tx)
    await repo.insertItems(cartId, items, tx)
    return loadCart(cartId, tx)
  }, CART_TX)
}

export async function updateCartItem(
  userId: number,
  itemId: number,
  quantity: number,
): Promise<CartItem> {
  const owned = await repo.findOwnedItem(userId, itemId)
  if (!owned) throw new NotFoundError(ITEM_NOT_FOUND)
  await repo.updateItemQuantity(owned.id, quantity)
  const row = await repo.findItemWithProductById(owned.id)
  if (!row) throw new NotFoundError(ITEM_NOT_FOUND)
  return toCartItem(row)
}

/** Removes one item; the cart goes with its last item. */
export async function removeCartItem(userId: number, itemId: number): Promise<void> {
  // Plain lookup outside the transaction: it only finds the cart to lock and keeps no snapshot.
  const owned = await repo.findOwnedItem(userId, itemId)
  if (!owned) throw new NotFoundError(ITEM_NOT_FOUND)

  await withTransaction(async (tx) => {
    // Lock order is cart, then item. Everything below is a locking (current) read, so it sees
    // what concurrent transactions committed while this one waited for the cart lock.
    if (!(await repo.lockOwnedCart(userId, owned.cartId, tx)))
      throw new NotFoundError(ITEM_NOT_FOUND)
    if (!(await repo.lockItem(owned.id, owned.cartId, tx))) throw new NotFoundError(ITEM_NOT_FOUND)
    if ((await repo.deleteItem(owned.id, tx)) === 0) throw new NotFoundError(ITEM_NOT_FOUND)
    if ((await repo.countItemsForUpdate(owned.cartId, tx)) === 0)
      await repo.deleteCart(owned.cartId, tx)
  }, CART_TX)
}

/**
 * For checkout: the user's cart with each item's current price and product status.
 * Locks the cart and its items (`FOR UPDATE`) until the caller's transaction ends.
 * Returns `null` when the cart does not exist or belongs to someone else.
 */
export async function findOwnedCartForCheckout(
  userId: number,
  cartId: number,
  tx: Tx,
): Promise<CheckoutCart | null> {
  const cart = await repo.lockOwnedCart(userId, cartId, tx)
  if (!cart) return null
  const itemRows = await repo.lockItemsByCartId(cart.id, tx)
  const productRows = await findProductsForCart(
    cart.shopId,
    itemRows.map((item) => item.productId),
    tx,
  )
  const productsById = new Map(productRows.map((product) => [product.id, product]))
  return {
    id: cart.id,
    shopId: cart.shopId,
    items: itemRows.flatMap((item) => {
      const product = productsById.get(item.productId)
      return product
        ? [
            {
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
              status: product.status,
            },
          ]
        : []
    }),
  }
}

/** Deletes the cart together with its items. */
export async function deleteCart(cartId: number, tx: Tx): Promise<void> {
  await repo.deleteCart(cartId, tx)
}

/** Every product must belong to the shop and be `available`. */
async function assertAllAvailable(
  shopId: number,
  items: ReplaceCartItemsInput['items'],
  tx: DbClient,
): Promise<void> {
  const found = await findProductsForCart(
    shopId,
    items.map((item) => item.productId),
    tx,
  )
  const ok = found.length === items.length && found.every((p) => p.status === 'available')
  if (!ok) {
    throw new ValidationError('Invalid request', [
      { path: 'items', message: 'All products must belong to this shop and be available' },
    ])
  }
}

async function loadCart(cartId: number, tx: DbClient): Promise<Cart> {
  const cart = await repo.findCartWithShopById(cartId, tx)
  if (!cart) throw new Error('Cart disappeared right after being saved')
  return toCart(cart, await repo.findItemsByCartIds([cartId], tx))
}
