import { z } from 'zod'
import { ORDER_STATUSES } from '../constants'

export const checkoutSchema = z.object({ cartId: z.number().int().positive() })

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUSES) })

export const updateOrderItemSchema = z.object({ isDone: z.boolean() })

export const orderItemSchema = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  unitPrice: z.number(),
  quantity: z.number().int(),
  isDone: z.boolean(),
})

export const orderSchema = z.object({
  id: z.number().int(),
  status: z.enum(ORDER_STATUSES),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  shop: z.object({ id: z.number().int(), name: z.string() }),
  items: z.array(orderItemSchema),
  totalPrice: z.number(),
})

export const shopOrderSchema = orderSchema.extend({
  customer: z.object({
    id: z.number().int(),
    firstName: z.string(),
    mobile: z.string(),
  }),
})

export const orderListSchema = z.object({
  waiting: z.array(orderSchema),
  finished: z.array(orderSchema),
})

export const shopOrderListSchema = z.object({
  waiting: z.array(shopOrderSchema),
  finished: z.array(shopOrderSchema),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type Order = z.infer<typeof orderSchema>
export type ShopOrder = z.infer<typeof shopOrderSchema>
export type OrderList = z.infer<typeof orderListSchema>
export type ShopOrderList = z.infer<typeof shopOrderListSchema>
