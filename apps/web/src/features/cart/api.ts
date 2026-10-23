import { cartItemSchema, cartSchema, type Cart, type CartItem } from '@canteen/shared'
import { z } from 'zod'
import { api } from '@/lib/api-client'

export function getCarts(): Promise<Cart[]> {
  return api.get('/api/cart', { schema: z.array(cartSchema) })
}

export function replaceCartItems(
  shopId: number,
  items: { productId: number; quantity: number }[],
): Promise<Cart | null> {
  return api.put(`/api/cart/shops/${shopId}/items`, {
    schema: cartSchema.nullable(),
    body: { items },
  })
}

export function updateCartItem(id: number, quantity: number): Promise<CartItem> {
  return api.patch(`/api/cart/items/${id}`, { schema: cartItemSchema, body: { quantity } })
}

export async function removeCartItem(id: number): Promise<void> {
  await api.delete(`/api/cart/items/${id}`, { schema: z.null() })
}
