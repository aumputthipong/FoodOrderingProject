import { ApiError } from './api-error'
import { errorMessage, FALLBACK_ERROR_MESSAGE, translateValidationMessage } from './error-messages'

test('maps codes to Thai', () => {
  expect(errorMessage(new ApiError(429, 'RATE_LIMITED', 'x'))).toBe('ลองใหม่อีกครั้งในอีกสักครู่')
  expect(errorMessage(new ApiError(0, 'NETWORK_ERROR', 'x'))).toBe(
    'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง',
  )
  expect(errorMessage(new Error('boom'))).toBe(FALLBACK_ERROR_MESSAGE)
})

test('overrides win', () => {
  expect(
    errorMessage(new ApiError(409, 'CONFLICT', 'x'), { CONFLICT: 'ชื่อผู้ใช้นี้ถูกใช้แล้ว' }),
  ).toBe('ชื่อผู้ใช้นี้ถูกใช้แล้ว')
})

test('translates known custom messages and keeps unknown ones', () => {
  expect(translateValidationMessage('Passwords do not match')).toBe('รหัสผ่านไม่ตรงกัน')
  expect(translateValidationMessage('ข้อความไทยจาก locale')).toBe('ข้อความไทยจาก locale')
})

test('uses the fallback for unknown messages', () => {
  expect(translateValidationMessage('Weird', 'ข้อมูลไม่ถูกต้อง')).toBe('ข้อมูลไม่ถูกต้อง')
})
