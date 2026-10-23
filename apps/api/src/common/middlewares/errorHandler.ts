import { unlink } from 'node:fs/promises'
import type { ErrorRequestHandler } from 'express'
import multer from 'multer'
import { pino } from 'pino'
import { ZodError } from 'zod'
import type { ErrorResponse } from '@canteen/shared'
import { env } from '../../config/env'
import { AppError } from '../errors'

// pino-http (and so req.log) is disabled under NODE_ENV=test, hence the fallback logger.
const fallbackLogger = pino({ level: env.NODE_ENV === 'test' ? 'silent' : 'info' })

export function toErrorResponse(err: unknown): { status: number; body: ErrorResponse } {
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      },
    }
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: err.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      },
    }
  }
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? `File too large (max ${env.UPLOAD_MAX_MB} MB)` : err.message
    return { status: 400, body: { error: { code: 'VALIDATION_ERROR', message } } }
  }
  if (err instanceof SyntaxError && (err as { type?: unknown }).type === 'entity.parse.failed') {
    return {
      status: 400,
      body: { error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body' } },
    }
  }
  const clientError = exposedClientError(err)
  if (clientError) {
    // 413, 415 and other 4xx from body-parser. The code set has no dedicated code for them, and
    // they are all problems with the request as sent.
    const message = clientError.status === 413 ? 'Request body too large' : clientError.message
    return { status: clientError.status, body: { error: { code: 'VALIDATION_ERROR', message } } }
  }
  return {
    status: 500,
    body: { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
  }
}

/**
 * An http-errors error (as body-parser throws) with a 4xx status whose message is marked safe to
 * show (`expose: true`); null for anything else.
 */
function exposedClientError(err: unknown): { status: number; message: string } | null {
  if (!(err instanceof Error)) return null
  const { status, statusCode, expose } = err as {
    status?: unknown
    statusCode?: unknown
    expose?: unknown
  }
  const code = typeof status === 'number' ? status : statusCode
  if (expose !== true || typeof code !== 'number' || !Number.isInteger(code)) return null
  return code >= 400 && code < 500 ? { status: code, message: err.message } : null
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err)
    return
  }
  // A request that fails after multer saved its upload must not leave the file behind.
  const uploaded = req.file?.path
  if (uploaded) void unlink(uploaded).catch(() => undefined)

  const { status, body } = toErrorResponse(err)
  if (status === 500) {
    const log = req.log ?? fallbackLogger
    log.error({ err }, 'Unhandled error')
  }
  res.status(status).json(body)
}
