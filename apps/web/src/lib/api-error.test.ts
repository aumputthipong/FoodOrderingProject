import { ApiError, isApiError } from './api-error'

test('ApiError carries status, code and details', () => {
  const e = new ApiError(400, 'VALIDATION_ERROR', 'Invalid', [{ path: 'a', message: 'b' }])
  expect(e).toBeInstanceOf(Error)
  expect(e.status).toBe(400)
  expect(e.code).toBe('VALIDATION_ERROR')
  expect(e.message).toBe('Invalid')
  expect(e.details).toEqual([{ path: 'a', message: 'b' }])
})

test('isApiError narrows only ApiError instances', () => {
  expect(isApiError(new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(true)
  expect(isApiError(new Error('x'))).toBe(false)
  expect(isApiError(null)).toBe(false)
})
