import { isApiError } from './api-error'
import { errorMessage, translateValidationMessage } from './error-messages'

const INVALID_MESSAGE = 'ข้อมูลไม่ถูกต้อง'

/**
 * Routes server validation details onto form fields. Returns a general message for the form
 * when something could not be placed on a field, otherwise null.
 */
export function applyServerErrors(
  error: unknown,
  setFieldError: (field: string, message: string) => void,
  fields: readonly string[],
): string | null {
  if (!isApiError(error) || error.code !== 'VALIDATION_ERROR') return errorMessage(error)
  const details = error.details ?? []
  if (details.length === 0) return errorMessage(error)
  let unplaced = false
  for (const detail of details) {
    if (fields.includes(detail.path)) {
      setFieldError(detail.path, translateValidationMessage(detail.message, INVALID_MESSAGE))
    } else {
      unplaced = true
    }
  }
  return unplaced ? errorMessage(error) : null
}
