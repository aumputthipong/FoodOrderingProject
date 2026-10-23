import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import { makeProduct } from '../../../../tests/fixtures'
import MenuItemCard from './MenuItemCard.vue'

test('available product shows a stepper that emits the new quantity', async () => {
  const product = makeProduct({ name: 'ข้าวมันไก่' })
  const wrapper = mount(MenuItemCard, { props: { product, quantity: 2 } })
  await wrapper.get('[aria-label="เพิ่มจำนวน ข้าวมันไก่"]').trigger('click')
  await wrapper.get('[aria-label="ลดจำนวน ข้าวมันไก่"]').trigger('click')
  expect(wrapper.emitted('change')).toEqual([[3], [1]])
})

test('card is highlighted only when the quantity is above zero', () => {
  const product = makeProduct()
  expect(mount(MenuItemCard, { props: { product, quantity: 1 } }).classes()).toContain(
    'border-primary',
  )
  expect(mount(MenuItemCard, { props: { product, quantity: 0 } }).classes()).not.toContain(
    'border-primary',
  )
})

test('not-available product has no add button and shows หมดชั่วคราว', () => {
  const wrapper = mount(MenuItemCard, {
    props: { product: makeProduct({ status: 'not-available' }), quantity: 0 },
  })
  expect(wrapper.find('button').exists()).toBe(false)
  expect(wrapper.text()).toContain('หมดชั่วคราว')
})
