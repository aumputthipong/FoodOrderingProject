import type { z } from 'zod'

/** Parse `data` with `schema`; a failure throws the ZodError for the central error handler. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.infer<S> {
  return schema.parse(data)
}
