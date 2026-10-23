import { formatMobile, formatPrice, formatTime, formatWait, waitMinutes } from './format'

test('formatPrice', () => {
  expect(formatPrice(50)).toBe('฿50')
  expect(formatPrice(1234.5)).toBe('฿1,234.50')
})

test('formatTime renders HH:mm in 24h', () => {
  expect(formatTime('2026-10-23T05:07:00Z')).toBe('12:07')
  expect(formatTime('2026-10-23T17:30:00Z')).toBe('00:30')
})

test.each([
  ['0900000001', '090-000-0001'],
  ['', ''],
  ['12345', '12345'],
  ['09000000ab', '09000000ab'],
])('formatMobile(%s)', (input, output) => {
  expect(formatMobile(input)).toBe(output)
})

test('waitMinutes floors and never goes negative', () => {
  const t = Date.parse('2026-10-23T05:00:00Z')
  expect(waitMinutes('2026-10-23T05:00:00Z', t + 59_000)).toBe(0)
  expect(waitMinutes('2026-10-23T05:00:00Z', t + 60_000)).toBe(1)
  expect(waitMinutes('2026-10-23T05:00:00Z', t + 11 * 60_000)).toBe(11)
  expect(waitMinutes('2026-10-23T05:00:00Z', t - 120_000)).toBe(0)
  expect(waitMinutes('2026-10-23T05:00:00Z', new Date(t + 5 * 60_000))).toBe(5)
})

test('formatWait', () => {
  expect(formatWait(0)).toBe('เพิ่งสั่ง')
  expect(formatWait(12)).toBe('รอ 12 นาที')
})
