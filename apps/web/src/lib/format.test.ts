import { formatPrice, formatTime } from './format'

test('formatPrice', () => {
  expect(formatPrice(50)).toBe('฿50')
  expect(formatPrice(1234.5)).toBe('฿1,234.50')
})

test('formatTime renders HH:mm in 24h', () => {
  expect(formatTime('2026-10-23T05:07:00Z')).toBe('12:07')
  expect(formatTime('2026-10-23T17:30:00Z')).toBe('00:30')
})
