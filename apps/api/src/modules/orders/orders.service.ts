import type { Order, OrderItem, OrderStatus, ShopOrder, User } from '@canteen/shared'
import { NotFoundError, ValidationError } from '../../common/errors'
import { withTransaction, type DbClient } from '../../db/client'
import { deleteCart, findOwnedCartForCheckout } from '../cart/cart.service'
import { getManageableShop } from '../shops/shops.service'
import { toOrder, toOrderItem, toShopOrder } from './orders.mapper'
import * as repo from './orders.repository'
import { queueDateOf } from './queue-number'

const ORDER_NOT_FOUND = 'Order not found'
const ITEM_NOT_FOUND = 'Order item not found'
const CART_NOT_FOUND = 'Cart not found'
const NO_SHOP = 'You do not have a shop'

/**
 * Turns the user's cart into an order: prices are snapshotted into the order items and the cart
 * is deleted, all in one transaction.
 */
export async function checkout(userId: number, cartId: number): Promise<Order> {
  return withTransaction(async (tx) => {
    // The locking read must come first: under REPEATABLE READ a plain read before it would fix a
    // snapshot that predates a concurrent checkout of the same cart.
    const cart = await findOwnedCartForCheckout(userId, cartId, tx)
    if (!cart) throw new NotFoundError(CART_NOT_FOUND)
    if (cart.items.length === 0) {
      throw new ValidationError('Invalid request', [
        { path: 'cartId', message: 'The cart is empty' },
      ])
    }
    if (cart.items.some((item) => item.status !== 'available')) {
      throw new ValidationError('Invalid request', [
        { path: 'cartId', message: 'All products in the cart must be available' },
      ])
    }

    const queueDate = queueDateOf(new Date())
    const queueNumber = await repo.nextQueueNumber(cart.shopId, queueDate, tx)
    const orderId = await repo.insertOrder(
      { customerId: userId, shopId: cart.shopId, queueDate, queueNumber },
      tx,
    )
    await repo.insertItems(
      orderId,
      cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      tx,
    )
    await deleteCart(cart.id, tx)
    return loadOrder(orderId, tx)
  })
}

/** The user's own orders: waiting oldest first, finished newest first. */
export async function listMyOrders(
  userId: number,
): Promise<{ waiting: Order[]; finished: Order[] }> {
  const rows = await repo.findOrdersByCustomer(userId)
  const itemRows = await repo.findItemsByOrderIds(rows.map((row) => row.id))
  return splitByStatus(rows.map((row) => toOrder(row, itemsOf(itemRows, row.id))))
}

/** Orders of the user's shop; `NotFoundError` when the user has no shop. */
export async function listShopOrders(
  user: User,
): Promise<{ waiting: ShopOrder[]; finished: ShopOrder[] }> {
  if (user.shopId === null) throw new NotFoundError(NO_SHOP)
  const rows = await repo.findOrdersByShop(user.shopId)
  const itemRows = await repo.findItemsByOrderIds(rows.map((row) => row.id))
  return splitByStatus(rows.map((row) => toShopOrder(row, itemsOf(itemRows, row.id))))
}

/** Sets an order's status; `finishedAt` is set when it becomes finished and cleared on reopening. */
export async function setOrderStatus(
  user: User,
  orderId: number,
  status: OrderStatus,
): Promise<ShopOrder> {
  return withTransaction(async (tx) => {
    const order = await repo.lockOrder(orderId, tx)
    if (!order) throw new NotFoundError(ORDER_NOT_FOUND)
    await getManageableShop(user, order.shopId, tx)

    if (order.status !== status) {
      await repo.updateStatus(orderId, status, status === 'finished' ? new Date() : null, tx)
    }
    const row = await repo.findOrderById(orderId, tx)
    if (!row) throw new NotFoundError(ORDER_NOT_FOUND)
    return toShopOrder(row, await repo.findItemsByOrderIds([orderId], tx))
  })
}

export async function setOrderItemDone(
  user: User,
  itemId: number,
  isDone: boolean,
): Promise<OrderItem> {
  const shopId = await repo.findItemShopId(itemId)
  if (shopId === null) throw new NotFoundError(ITEM_NOT_FOUND)
  await getManageableShop(user, shopId)

  await repo.updateItemDone(itemId, isDone)
  const row = await repo.findItemById(itemId)
  if (!row) throw new NotFoundError(ITEM_NOT_FOUND)
  return toOrderItem(row)
}

async function loadOrder(orderId: number, tx: DbClient): Promise<Order> {
  const row = await repo.findOrderById(orderId, tx)
  if (!row) throw new Error('Order disappeared right after being saved')
  return toOrder(row, await repo.findItemsByOrderIds([orderId], tx))
}

function itemsOf<T extends { orderId: number }>(itemRows: T[], orderId: number): T[] {
  return itemRows.filter((item) => item.orderId === orderId)
}

/** `orders` arrive oldest first: waiting keeps that order, finished is reversed (newest first). */
function splitByStatus<T extends { status: OrderStatus }>(
  orders: T[],
): { waiting: T[]; finished: T[] } {
  return {
    waiting: orders.filter((order) => order.status === 'waiting'),
    finished: orders.filter((order) => order.status === 'finished').reverse(),
  }
}
