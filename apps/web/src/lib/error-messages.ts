import { isApiError, type ClientErrorCode } from './api-error'

export const FALLBACK_ERROR_MESSAGE = 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'

const CODE_MESSAGES: Record<ClientErrorCode, string> = {
  VALIDATION_ERROR: 'ข้อมูลไม่ถูกต้อง',
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบ',
  FORBIDDEN: 'ไม่มีสิทธิ์ทำรายการนี้',
  NOT_FOUND: 'ไม่พบข้อมูล',
  CONFLICT: 'ข้อมูลซ้ำกับที่มีอยู่',
  RATE_LIMITED: 'ลองใหม่อีกครั้งในอีกสักครู่',
  INTERNAL_ERROR: 'ระบบขัดข้อง ลองใหม่อีกครั้ง',
  NETWORK_ERROR: 'เชื่อมต่อไม่สำเร็จ ลองใหม่อีกครั้ง',
  INVALID_RESPONSE: 'ระบบขัดข้อง ลองใหม่อีกครั้ง',
}

const VALIDATION_MESSAGES: Record<string, string> = {
  'Password must be at least 8 characters': 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
  'Password must contain a lowercase letter': 'รหัสผ่านต้องมีตัวพิมพ์เล็ก',
  'Password must contain an uppercase letter': 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่',
  'Password must contain a digit': 'รหัสผ่านต้องมีตัวเลข',
  'Mobile must be 10 digits starting with 0': 'เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0',
  'Passwords do not match': 'รหัสผ่านไม่ตรงกัน',
  'Image is required': 'กรุณาเลือกรูป',
  'Image must be a JPEG, PNG, WebP, AVIF or GIF file':
    'รองรับเฉพาะไฟล์ JPEG, PNG, WebP, AVIF หรือ GIF',
}

export function errorMessage(
  error: unknown,
  overrides?: Partial<Record<ClientErrorCode, string>>,
): string {
  if (!isApiError(error)) return FALLBACK_ERROR_MESSAGE
  return overrides?.[error.code] ?? CODE_MESSAGES[error.code]
}

export function translateValidationMessage(message: string, fallback?: string): string {
  return VALIDATION_MESSAGES[message] ?? fallback ?? message
}
