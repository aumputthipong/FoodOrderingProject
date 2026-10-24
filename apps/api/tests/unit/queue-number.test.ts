import { queueDateOf } from '../../src/modules/orders/queue-number'

test('the queue day follows Bangkok midnight, not UTC', () => {
  expect(queueDateOf(new Date('2026-03-01T16:59:59Z'))).toBe('2026-03-01')
  expect(queueDateOf(new Date('2026-03-01T17:00:00Z'))).toBe('2026-03-02')
})
