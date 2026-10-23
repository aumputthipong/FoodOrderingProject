import { orderListSchema, orderSchema, type Order, type OrderList } from '@canteen/shared'
import { api } from '@/lib/api-client'

export function getMyOrders(): Promise<OrderList> {
  return api.get('/api/orders/mine', { schema: orderListSchema })
}

export function checkout(cartId: number): Promise<Order> {
  return api.post('/api/orders', { schema: orderSchema, body: { cartId } })
}
