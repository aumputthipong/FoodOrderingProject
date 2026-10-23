import type { Order, OrderItem, ShopOrder } from '@canteen/shared'
import { toImageUrl } from '../../common/http'
import { roundMoney } from '../../common/money'
import type { OrderItemRow, OrderRow } from './orders.repository'

export function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    imageUrl: toImageUrl(row.imageFilename),
    unitPrice: row.unitPrice,
    quantity: row.quantity,
    isDone: row.isDone,
  }
}

export function toOrder(row: OrderRow, itemRows: OrderItemRow[]): Order {
  const items = itemRows.map(toOrderItem)
  return {
    id: row.id,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt ? row.finishedAt.toISOString() : null,
    shop: { id: row.shopId, name: row.shopName },
    items,
    totalPrice: roundMoney(
      itemRows.reduce((sum, item) => sum + roundMoney(item.unitPrice * item.quantity), 0),
    ),
  }
}

export function toShopOrder(row: OrderRow, itemRows: OrderItemRow[]): ShopOrder {
  return {
    ...toOrder(row, itemRows),
    customer: { id: row.customerId, firstName: row.customerFirstName, mobile: row.customerMobile },
  }
}
