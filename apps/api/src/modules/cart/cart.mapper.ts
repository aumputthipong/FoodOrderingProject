import type { Cart, CartItem } from '@canteen/shared'
import { toImageUrl } from '../../common/http'
import type { CartItemRow, CartWithShopRow } from './cart.repository'

/** Rounds a money amount to 2 decimals. */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

export function toCartItem(row: CartItemRow): CartItem {
  return {
    id: row.id,
    productId: row.productId,
    name: row.name,
    imageUrl: toImageUrl(row.imageFilename),
    price: row.price,
    quantity: row.quantity,
    subtotal: roundMoney(row.price * row.quantity),
  }
}

export function toCart(cart: CartWithShopRow, itemRows: CartItemRow[]): Cart {
  const items = itemRows.map(toCartItem)
  return {
    id: cart.id,
    shop: { id: cart.shopId, name: cart.shopName, imageUrl: toImageUrl(cart.shopImageFilename) },
    items,
    totalPrice: roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0)),
  }
}
