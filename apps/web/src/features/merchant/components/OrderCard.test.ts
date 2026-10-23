import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import { formatTime } from '@/lib/format'
import { makeShopOrder } from '../../../../tests/fixtures'
import OrderCard from './OrderCard.vue'

test('emits toggleItem with the new value', async () => {
  const wrapper = mount(OrderCard, {
    props: { order: makeShopOrder({ id: 42 }), variant: 'waiting' },
  })
  expect(wrapper.text()).toContain('#42')
  expect(wrapper.text()).toContain('สมชาย · 0812345678')
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
    },
  })
  expect(wrapper.find('[role="checkbox"]').exists()).toBe(false)
  expect(wrapper.text()).toContain(`เสร็จ ${formatTime(finishedAt)} · ฿100`)
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('reopen')).toEqual([[42]])
})
