import { z } from 'zod'
import { PRODUCT_STATUSES } from '../constants'

export const productSchema = z.object({
  id: z.number().int(),
  shopId: z.number().int(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  status: z.enum(PRODUCT_STATUSES),
})

export type Product = z.infer<typeof productSchema>
