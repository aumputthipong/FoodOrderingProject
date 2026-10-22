import type { ErrorCode } from '@canteen/shared'

export type ErrorDetail = { path: string; message: string }

export class AppError extends Error {
  readonly status: number
  readonly code: ErrorCode
  readonly details?: ErrorDetail[]

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetail[]) {
    super(message)
    this.name = new.target.name
    this.status = status
    this.code = code
    if (details) this.details = details
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[]) {
    super(400, 'VALIDATION_ERROR', message, details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, 'FORBIDDEN', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message)
  }
}
