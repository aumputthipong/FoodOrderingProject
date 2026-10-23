import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import { makeProduct } from '../../../../tests/fixtures'
import MenuItemCard from './MenuItemCard.vue'

test('available product shows an add button that emits quantity + 1', async () => {
  const wrapper = mount(MenuItemCard, { props: { product: makeProduct(), quantity: 2 } })
  await wrapper.get('button').trigger('click')
  expect(wrapper.emitted('change')).toEqual([[3]])
})

test('not-available product has no add button and shows หมดชั่วคราว', () => {
  const wrapper = mount(MenuItemCard, {
    props: { product: makeProduct({ status: 'not-available' }), quantity: 0 },
  })
  expect(wrapper.find('button').exists()).toBe(false)
  expect(wrapper.text()).toContain('หมดชั่วคราว')
})
