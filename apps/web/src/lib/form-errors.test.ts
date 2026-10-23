import { ApiError } from './api-error'
import { applyServerErrors } from './form-errors'

const fields = ['username', 'password']

test('routes known paths to fields and returns null', () => {
  const setFieldError = vi.fn()
  const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid', [
    { path: 'password', message: 'Password must contain a digit' },
  ])
  expect(applyServerErrors(error, setFieldError, fields)).toBeNull()
  expect(setFieldError).toHaveBeenCalledWith('password', 'รหัสผ่านต้องมีตัวเลข')
})

test('returns a general message for unknown paths or non-validation errors', () => {
  const setFieldError = vi.fn()
  const withUnknown = new ApiError(400, 'VALIDATION_ERROR', 'Invalid', [
    { path: 'password', message: 'Password must contain a digit' },
    { path: 'other', message: 'x' },
  ])
  expect(applyServerErrors(withUnknown, setFieldError, fields)).toBe('ข้อมูลไม่ถูกต้อง')
  expect(setFieldError).toHaveBeenCalledTimes(1)
  expect(applyServerErrors(new ApiError(0, 'NETWORK_ERROR', 'x'), setFieldError, fields)).toBe(
    'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง',
  )
  expect(applyServerErrors(new Error('boom'), setFieldError, fields)).toBe(
    'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง',
  )
})

test('a validation error without details yields the general message', () => {
  const setFieldError = vi.fn()
  const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid')
  expect(applyServerErrors(error, setFieldError, fields)).toBe('ข้อมูลไม่ถูกต้อง')
  expect(setFieldError).not.toHaveBeenCalled()
})

test('server detail messages are translated, unknown ones become "ข้อมูลไม่ถูกต้อง"', () => {
  const setFieldError = vi.fn()
  const error = new ApiError(400, 'VALIDATION_ERROR', 'Invalid', [
    { path: 'username', message: 'Too small: expected string to have >=5 characters' },
  ])
  expect(applyServerErrors(error, setFieldError, fields)).toBeNull()
  expect(setFieldError).toHaveBeenCalledWith('username', 'ข้อมูลไม่ถูกต้อง')
})
