import type { ErrorCode, ErrorResponse } from '@canteen/shared'

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE'

export type ErrorDetail = NonNullable<ErrorResponse['error']['details']>[number]

export class ApiError extends Error {
  readonly status: number
  readonly code: ClientErrorCode
  readonly details?: ErrorDetail[]

  constructor(status: number, code: ClientErrorCode, message: string, details?: ErrorDetail[]) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}
