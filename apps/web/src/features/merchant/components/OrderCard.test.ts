import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import { formatTime } from '@/lib/format'
import { makeShopOrder } from '../../../../tests/fixtures'
import OrderCard from './OrderCard.vue'

const CREATED = '2026-01-01T03:00:00.000Z'
const NOW = new Date(CREATED).getTime() + 5 * 60_000
const minutesAfter = (m: number) => new Date(CREATED).getTime() + m * 60_000

function pill(now: number) {
  const wrapper = mount(OrderCard, {
    props: { order: makeShopOrder({ createdAt: CREATED }), variant: 'waiting', now },
  })
  return wrapper.get('[data-testid="wait-pill"]')
}

test('emits toggleItem with the new value', async () => {
  const wrapper = mount(OrderCard, {
    props: { order: makeShopOrder({ id: 42, queueNumber: 7 }), variant: 'waiting', now: NOW },
  })
  expect(wrapper.text()).toContain('#7')
  expect(wrapper.text()).toContain('สมชาย · 081-234-5678')
  await wrapper.get('[role="checkbox"]').trigger('click')
  expect(wrapper.emitted('toggleItem')).toEqual([[1, true]])
  await wrapper.get('button:not([role="checkbox"])').trigger('click')
  expect(wrapper.emitted('complete')).toEqual([[42]])
})

test('finished variant shows reopen instead of checkboxes', async () => {
  const finishedAt = '2026-01-01T03:30:00.000Z'
  const wrapper = mount(OrderCard, {
    props: {
      order: makeShopOrder({ id: 42, status: 'finished', finishedAt }),
      variant: 'finished',
      now: NOW,
    },
  })
  expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)
  expect(wrapper.text()).toContain(`เสร็จ ${formatTime(finishedAt)} · ฿100`)
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('reopen')).toEqual([[42]])
})

test('wait pill turns accent after 10 minutes', () => {
  const late = pill(minutesAfter(11))
  expect(late.text()).toBe('รอ 11 นาที')
  expect(late.classes()).toContain('bg-accent')
  const edge = pill(minutesAfter(10))
  expect(edge.text()).toBe('รอ 10 นาที')
  expect(edge.classes()).toContain('bg-muted')
  expect(edge.classes()).not.toContain('bg-accent')
})

test('wait pill says เพิ่งสั่ง under a minute', () => {
  expect(pill(minutesAfter(0)).text()).toBe('เพิ่งสั่ง')
})

test('mobile is formatted 090-000-0001', () => {
  const wrapper = mount(OrderCard, {
    props: {
      order: makeShopOrder({ customer: { id: 1, firstName: 'ก', mobile: '0900000001' } }),
      variant: 'waiting',
      now: NOW,
    },
  })
  expect(wrapper.text()).toContain('090-000-0001')
})
