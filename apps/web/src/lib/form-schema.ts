import type { TypedSchema } from 'vee-validate'
import type { z } from 'zod'
import { translateValidationMessage } from './error-messages'

const REQUIRED_MESSAGE = 'กรุณากรอกข้อมูลนี้'
const REQUIRED_PRICE_MESSAGE = 'กรุณากรอกราคา'

function valueAt(values: unknown, path: PropertyKey[]): unknown {
  let current = values
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<PropertyKey, unknown>)[key]
  }
  return current
}

function isMissing(issue: z.core.$ZodIssue, values: unknown): boolean {
  if (issue.code === 'invalid_type') return valueAt(values, issue.path) === undefined
  return issue.code === 'too_small' && issue.origin === 'string' && issue.minimum === 1
}

export function toFormSchema<S extends z.ZodType>(schema: S): TypedSchema<z.input<S>, z.output<S>> {
  return {
    __type: 'VVTypedSchema',
    async parse(values) {
      const result = await schema.safeParseAsync(values)
      if (result.success) return { value: result.data, errors: [] }
      const grouped = new Map<string, string[]>()
      for (const issue of result.error.issues) {
        const path = issue.path.join('.')
        const messages = grouped.get(path) ?? []
        const message = isMissing(issue, values)
          ? path === 'price'
            ? REQUIRED_PRICE_MESSAGE
            : REQUIRED_MESSAGE
          : translateValidationMessage(issue.message)
        messages.push(message)
        grouped.set(path, messages)
      }
      return { errors: [...grouped].map(([path, errors]) => ({ path, errors })) }
    },
  }
}
