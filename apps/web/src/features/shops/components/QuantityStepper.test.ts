import { mount } from '@vue/test-utils'
import { expect, test } from 'vitest'
import QuantityStepper from './QuantityStepper.vue'

test('clamps at max 99 and min', async () => {
  const atMax = mount(QuantityStepper, { props: { modelValue: 99, label: 'ข้าว' } })
  await atMax.get('[aria-label="เพิ่มจำนวน ข้าว"]').trigger('click')
  expect(atMax.emitted('update:modelValue')).toEqual([[99]])

  const atMin = mount(QuantityStepper, { props: { modelValue: 2, min: 2, label: 'ข้าว' } })
  await atMin.get('[aria-label="ลดจำนวน ข้าว"]').trigger('click')
  expect(atMin.emitted('update:modelValue')).toEqual([[2]])

  const normal = mount(QuantityStepper, { props: { modelValue: 3, label: 'ข้าว' } })
  await normal.get('[aria-label="ลดจำนวน ข้าว"]').trigger('click')
  await normal.get('[aria-label="เพิ่มจำนวน ข้าว"]').trigger('click')
  expect(normal.emitted('update:modelValue')).toEqual([[2], [4]])
})

test('shows only + at zero', async () => {
  const wrapper = mount(QuantityStepper, { props: { modelValue: 0, label: 'ข้าว' } })
  expect(wrapper.findAll('button')).toHaveLength(1)
  expect(wrapper.find('[aria-label="ลดจำนวน ข้าว"]').exists()).toBe(false)
  await wrapper.get('[aria-label="เพิ่มจำนวน ข้าว"]').trigger('click')
  expect(wrapper.emitted('update:modelValue')).toEqual([[1]])
})

test('shows the count with 44px buttons when above zero', () => {
  const wrapper = mount(QuantityStepper, { props: { modelValue: 5, label: 'ข้าว' } })
  expect(wrapper.text()).toContain('5')
  for (const button of wrapper.findAll('button')) expect(button.classes()).toContain('size-11')
})

test('press states are opaque and darker than hover', () => {
  const wrapper = mount(QuantityStepper, { props: { modelValue: 1, label: 'ข้าว' } })
  const minus = wrapper.get('[aria-label="ลดจำนวน ข้าว"]').classes()
  const plus = wrapper.get('[aria-label="เพิ่มจำนวน ข้าว"]').classes()
  expect(minus).toContain('hover:bg-muted')
  expect(minus).toContain('active:bg-muted-active')
  expect(plus).toContain('hover:bg-primary-hover')
  expect(plus).toContain('active:bg-primary-active')
  for (const cls of [...minus, ...plus]) expect(cls).not.toMatch(/bg-(primary|muted)\/\d/)
})
