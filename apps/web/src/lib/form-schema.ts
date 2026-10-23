import type { TypedSchema } from 'vee-validate'
import type { z } from 'zod'
import { translateValidationMessage } from './error-messages'

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
        messages.push(translateValidationMessage(issue.message))
        grouped.set(path, messages)
      }
      return { errors: [...grouped].map(([path, errors]) => ({ path, errors })) }
    },
  }
}
