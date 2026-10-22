import multer from 'multer'
import { z } from 'zod'
import { ConflictError, ForbiddenError } from '../../src/common/errors'
import { toErrorResponse } from '../../src/common/middlewares/errorHandler'

test('maps ZodError to VALIDATION_ERROR with paths', () => {
  const err = z.object({ price: z.number() }).safeParse({ price: 'x' }).error
  const { status, body } = toErrorResponse(err)
  expect(status).toBe(400)
  expect(body.error.code).toBe('VALIDATION_ERROR')
  expect(body.error.details?.[0]?.path).toBe('price')
})

test('maps AppError subclasses to their status and code', () => {
  expect(toErrorResponse(new ConflictError('taken'))).toEqual({
    status: 409,
    body: { error: { code: 'CONFLICT', message: 'taken' } },
  })
  expect(toErrorResponse(new ForbiddenError()).status).toBe(403)
})

test('maps multer size errors to VALIDATION_ERROR', () => {
  expect(toErrorResponse(new multer.MulterError('LIMIT_FILE_SIZE', 'image')).body.error.code).toBe(
    'VALIDATION_ERROR',
  )
})

test('hides internals of unexpected errors', () => {
  const { status, body } = toErrorResponse(new Error('ER_NO_SUCH_TABLE select * from x'))
  expect(status).toBe(500)
  expect(body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } })
})
