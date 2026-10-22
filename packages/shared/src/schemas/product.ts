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

export const productFieldsSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(2000),
  price: z.coerce.number().positive().max(99999999.99),
})

export const productStatusBodySchema = z.object({ status: z.enum(PRODUCT_STATUSES) })

export type Product = z.infer<typeof productSchema>
export type ProductFields = z.infer<typeof productFieldsSchema>
export type ProductStatusBody = z.infer<typeof productStatusBodySchema>
