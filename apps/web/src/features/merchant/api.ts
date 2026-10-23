import {
  orderItemSchema,
  shopOrderListSchema,
  shopOrderSchema,
  type OrderItem,
  type OrderStatus,
  type ShopOrder,
  type ShopOrderList,
} from '@canteen/shared'
import { api } from '@/lib/api-client'

export function getShopOrders(): Promise<ShopOrderList> {
  return api.get('/api/shops/mine/orders', { schema: shopOrderListSchema })
}

export function setOrderStatus(id: number, status: OrderStatus): Promise<ShopOrder> {
  return api.patch(`/api/orders/${id}/status`, { schema: shopOrderSchema, body: { status } })
}

export function setOrderItemDone(id: number, isDone: boolean): Promise<OrderItem> {
  return api.patch(`/api/order-items/${id}`, { schema: orderItemSchema, body: { isDone } })
}
