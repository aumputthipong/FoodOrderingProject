import { mount } from '@vue/test-utils'
import ImageWithFallback from './ImageWithFallback.vue'

test('shows the fallback when src is null', () => {
  const wrapper = mount(ImageWithFallback, { props: { src: null, alt: 'x', ratio: '1/1' } })
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.find('[data-testid="image-fallback"]').exists()).toBe(true)
})

test('renders a lazy image when src is given', () => {
  const wrapper = mount(ImageWithFallback, {
    props: { src: '/a.jpg', alt: 'อาหาร', ratio: '16/10' },
  })
  const img = wrapper.get('img')
  expect(img.attributes('src')).toBe('/a.jpg')
  expect(img.attributes('alt')).toBe('อาหาร')
  expect(img.attributes('loading')).toBe('lazy')
})

test('swaps to the fallback after an image error', async () => {
  const wrapper = mount(ImageWithFallback, {
    props: { src: '/broken.jpg', alt: 'x', ratio: '16/9' },
  })
  await wrapper.get('img').trigger('error')
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.find('[data-testid="image-fallback"]').exists()).toBe(true)
})

test('merges a class onto the ratio wrapper', () => {
  const wrapper = mount(ImageWithFallback, {
    props: { src: null, alt: 'x', ratio: '1/1', class: 'w-[76px] rounded-thumb' },
  })
  expect(wrapper.classes()).toContain('rounded-thumb')
  expect(wrapper.classes()).toContain('w-[76px]')
  expect(wrapper.classes()).not.toContain('w-full')
})
