import { asc, eq, inArray } from 'drizzle-orm'
import type { OrderStatus } from '@canteen/shared'
import { db, type DbClient } from '../../db/client'
import { orderItems, orders, products, shops, users } from '../../db/schema'

/** An order with its shop and customer, as needed to build `Order` / `ShopOrder`. */
export type OrderRow = {
  id: number
  status: OrderStatus
  createdAt: Date
  finishedAt: Date | null
  shopId: number
  shopName: string
  customerId: number
  customerFirstName: string
  customerMobile: string
}

/** An order item joined with its (current) product for name and image. */
export type OrderItemRow = {
  id: number
  orderId: number
  productId: number
  name: string
  imageFilename: string | null
  unitPrice: number
  quantity: number
  isDone: boolean
}

export type NewOrderValues = { customerId: number; shopId: number }
export type NewOrderItemValues = { productId: number; quantity: number; unitPrice: number }

const orderColumns = {
  id: orders.id,
  status: orders.status,
  createdAt: orders.createdAt,
  finishedAt: orders.finishedAt,
  shopId: orders.shopId,
  shopName: shops.name,
  customerId: orders.customerId,
  customerFirstName: users.firstName,
  customerMobile: users.mobile,
}

const orderItemColumns = {
  id: orderItems.id,
  orderId: orderItems.orderId,
  productId: orderItems.productId,
  name: products.name,
  imageFilename: products.imageFilename,
  unitPrice: orderItems.unitPrice,
  quantity: orderItems.quantity,
  isDone: orderItems.isDone,
}

function selectOrders(client: DbClient) {
  return client
    .select(orderColumns)
    .from(orders)
    .innerJoin(shops, eq(shops.id, orders.shopId))
    .innerJoin(users, eq(users.id, orders.customerId))
}

export async function insertOrder(values: NewOrderValues, client: DbClient = db): Promise<number> {
  const [result] = await client.insert(orders).values(values)
  return result.insertId
}

export async function insertItems(
  orderId: number,
  items: NewOrderItemValues[],
  client: DbClient = db,
): Promise<void> {
  if (items.length === 0) return
  await client.insert(orderItems).values(items.map((item) => ({ orderId, ...item })))
}

export async function findOrderById(
  orderId: number,
  client: DbClient = db,
): Promise<OrderRow | null> {
  const rows = await selectOrders(client).where(eq(orders.id, orderId)).limit(1)
  return rows[0] ?? null
}

/** The customer's orders, oldest first. */
export async function findOrdersByCustomer(
  customerId: number,
  client: DbClient = db,
): Promise<OrderRow[]> {
  return selectOrders(client)
    .where(eq(orders.customerId, customerId))
    .orderBy(asc(orders.createdAt), asc(orders.id))
}

/** The shop's orders, oldest first. */
export async function findOrdersByShop(shopId: number, client: DbClient = db): Promise<OrderRow[]> {
  return selectOrders(client)
    .where(eq(orders.shopId, shopId))
    .orderBy(asc(orders.createdAt), asc(orders.id))
}

/** Items of the given orders joined with their product, ordered by item id. */
export async function findItemsByOrderIds(
  orderIds: number[],
  client: DbClient = db,
): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return []
  return client
    .select(orderItemColumns)
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id))
}

export async function findItemById(
  itemId: number,
  client: DbClient = db,
): Promise<OrderItemRow | null> {
  const rows = await client
    .select(orderItemColumns)
    .from(orderItems)
    .innerJoin(products, eq(products.id, orderItems.productId))
    .where(eq(orderItems.id, itemId))
    .limit(1)
  return rows[0] ?? null
}

/** The shop an order item belongs to (through its order); null if the item does not exist. */
export async function findItemShopId(
  itemId: number,
  client: DbClient = db,
): Promise<number | null> {
  const rows = await client
    .select({ shopId: orders.shopId })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(orderItems.id, itemId))
    .limit(1)
  return rows[0]?.shopId ?? null
}

/** Locks the order row with `FOR UPDATE`; null when it does not exist. */
export async function lockOrder(
  orderId: number,
  client: DbClient = db,
): Promise<{ id: number; shopId: number; status: OrderStatus; finishedAt: Date | null } | null> {
  const rows = await client
    .select({
      id: orders.id,
      shopId: orders.shopId,
      status: orders.status,
      finishedAt: orders.finishedAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1)
    .for('update')
  return rows[0] ?? null
}

export async function updateStatus(
  orderId: number,
  status: OrderStatus,
  finishedAt: Date | null,
  client: DbClient = db,
): Promise<void> {
  await client.update(orders).set({ status, finishedAt }).where(eq(orders.id, orderId))
}

export async function updateItemDone(
  itemId: number,
  isDone: boolean,
  client: DbClient = db,
): Promise<void> {
  await client.update(orderItems).set({ isDone }).where(eq(orderItems.id, itemId))
}
