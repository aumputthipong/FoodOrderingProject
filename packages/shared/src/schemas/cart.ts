import { z } from 'zod'

const quantitySchema = z.number().int().min(1).max(99)

export const cartItemSchema = z.object({
  id: z.number().int(),
  productId: z.number().int(),
  name: z.string(),
  imageUrl: z.string().nullable(),
  price: z.number(),
  quantity: z.number().int(),
  subtotal: z.number(),
})

export const cartSchema = z.object({
  id: z.number().int(),
  shop: z.object({
    id: z.number().int(),
    name: z.string(),
    imageUrl: z.string().nullable(),
  }),
  items: z.array(cartItemSchema),
  totalPrice: z.number(),
})

export const replaceCartItemsSchema = z.object({
  items: z
    .array(z.object({ productId: z.number().int().positive(), quantity: quantitySchema }))
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      message: 'productId must be unique',
    }),
})

export const updateCartItemSchema = z.object({ quantity: quantitySchema })

export const cartQuerySchema = z.object({
  shopId: z.coerce.number().int().positive().optional(),
})

export type Cart = z.infer<typeof cartSchema>
export type CartItem = z.infer<typeof cartItemSchema>
export type ReplaceCartItemsInput = z.infer<typeof replaceCartItemsSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type CartQuery = z.infer<typeof cartQuerySchema>
