import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import { formatTime } from '@/lib/format'
import { makeOrder } from '../../../../tests/fixtures'
import QueueTicket from './QueueTicket.vue'

const item = (id: number, name: string, isDone: boolean) => ({
  id,
  productId: id,
  name,
  imageUrl: null,
  unitPrice: 50,
  quantity: 2,
  isDone,
})

test('shows number, progress and per-item state', () => {
  const order = makeOrder({
    id: 42,
    items: [item(1, 'ผัดกระเพรา', true), item(2, 'ข้าวผัด', false)],
    totalPrice: 200,
  })
  const wrapper = mount(QueueTicket, { props: { order } })
  const text = wrapper.text()
  expect(wrapper.get('[data-testid="queue-number"]').text()).toBe('#42')
  expect(text).toContain('ร้านข้าวมันไก่')
  expect(text).toContain(`สั่งเมื่อ ${formatTime(order.createdAt)}`)
  expect(text).toContain('เสร็จแล้ว 1 จาก 2 รายการ')
  expect(text).toContain('กำลังทำ')
  expect(text).toContain('฿200')
  expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('50')
  const rows = wrapper.findAll('li')
  expect(rows).toHaveLength(2)
  expect(rows[0]!.text()).toContain('ผัดกระเพรา × 2')
  expect(rows[0]!.text()).toContain('เสร็จ')
  expect(rows[0]!.find('.text-success').exists()).toBe(true)
  expect(rows[1]!.text()).toContain('ข้าวผัด × 2')
  expect(rows[1]!.text()).toContain('รอ')
  expect(rows[1]!.find('.text-success').exists()).toBe(false)
})

test('finished order shows เสร็จแล้ว and finish time', () => {
  const order = makeOrder({
    id: 7,
    status: 'finished',
    finishedAt: '2026-01-01T03:20:00.000Z',
    items: [item(1, 'ผัดกระเพรา', true)],
  })
  const wrapper = mount(QueueTicket, { props: { order } })
  const text = wrapper.text()
  expect(text).toContain('เสร็จ ' + formatTime('2026-01-01T03:20:00.000Z'))
  expect(text).toContain('เสร็จแล้ว 1 จาก 1 รายการ')
  expect(text).not.toContain('กำลังทำ')
  expect(wrapper.get('[data-testid="status-pill"]').text()).toBe('เสร็จแล้ว')
})
