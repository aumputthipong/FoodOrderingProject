import { z } from 'zod'

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

export const shopIdParamSchema = z.object({ shopId: z.coerce.number().int().positive() })

export const errorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
])

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
})

export type ErrorCode = z.infer<typeof errorCodeSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
