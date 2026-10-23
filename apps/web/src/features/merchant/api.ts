import {
  orderItemSchema,
  productSchema,
  shopOrderListSchema,
  shopOrderSchema,
  shopSchema,
  type OrderItem,
  type OrderStatus,
  type Product,
  type ProductStatus,
  type Shop,
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

export function createShop(form: FormData): Promise<Shop> {
  return api.post('/api/shops', { schema: shopSchema, body: form })
}

export function updateShop(id: number, form: FormData): Promise<Shop> {
  return api.put(`/api/shops/${id}`, { schema: shopSchema, body: form })
}

export function createProduct(shopId: number, form: FormData): Promise<Product> {
  return api.post(`/api/shops/${shopId}/products`, { schema: productSchema, body: form })
}

export function updateProduct(id: number, form: FormData): Promise<Product> {
  return api.put(`/api/products/${id}`, { schema: productSchema, body: form })
}

export function setProductStatus(id: number, status: ProductStatus): Promise<Product> {
  return api.patch(`/api/products/${id}/status`, { schema: productSchema, body: { status } })
}
