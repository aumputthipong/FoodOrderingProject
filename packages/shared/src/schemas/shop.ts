import { z } from 'zod'
import { productSchema } from './product'

export const shopFieldsSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
})

export const shopSearchQuerySchema = z.object({
  search: z.string().optional(),
})

export const shopSchema = z.object({
  id: z.number().int(),
  ownerId: z.number().int(),
  name: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
})

export const shopDetailSchema = shopSchema.extend({ products: z.array(productSchema) })

export type ShopFields = z.infer<typeof shopFieldsSchema>
export type ShopSearchQuery = z.infer<typeof shopSearchQuerySchema>
export type Shop = z.infer<typeof shopSchema>
export type ShopDetail = z.infer<typeof shopDetailSchema>
