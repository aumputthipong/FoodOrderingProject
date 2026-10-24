import { mount } from '@vue/test-utils'
import ImageUploadField, { ACCEPTED_IMAGE_TYPES } from './ImageUploadField.vue'

const createObjectURL = vi.fn(() => 'blob:preview')
const revokeObjectURL = vi.fn()

const urlMethods = ['createObjectURL', 'revokeObjectURL'] as const
const originals = new Map<string, PropertyDescriptor | undefined>()

beforeEach(() => {
  for (const name of urlMethods) {
    originals.set(name, Object.getOwnPropertyDescriptor(URL, name))
  }
  createObjectURL.mockClear()
  revokeObjectURL.mockClear()
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
})

afterEach(() => {
  for (const name of urlMethods) {
    const original = originals.get(name)
    if (original) Object.defineProperty(URL, name, original)
    else delete (URL as unknown as Record<string, unknown>)[name]
  }
})

function setup(props: Record<string, unknown> = {}) {
  return mount(ImageUploadField, { props: { modelValue: null, label: 'รูปร้าน', ...props } })
}

async function choose(wrapper: ReturnType<typeof setup>, file: File) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

const png = () => new File(['x'], 'a.png', { type: 'image/png' })

test('emits the chosen file and previews it', async () => {
  const wrapper = setup()
  const file = png()
  await choose(wrapper, file)
  expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([file])
  await wrapper.setProps({ modelValue: file })
  expect(createObjectURL).toHaveBeenCalledWith(file)
  expect(wrapper.get('img').attributes('src')).toBe('blob:preview')
})

test('rejects an oversized file with a Thai message and keeps the old value', async () => {
  const wrapper = setup()
  const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
  await choose(wrapper, big)
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.emitted('invalid')?.[0]).toEqual(['ไฟล์ต้องมีขนาดไม่เกิน 5 MB'])
  expect(wrapper.text()).toContain('ไฟล์ต้องมีขนาดไม่เกิน 5 MB')
})

test('uses maxMb in the size message', async () => {
  const wrapper = setup({ maxMb: 1 })
  const big = new File([new Uint8Array(1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
  await choose(wrapper, big)
  expect(wrapper.emitted('invalid')?.[0]).toEqual(['ไฟล์ต้องมีขนาดไม่เกิน 1 MB'])
})

test('rejects an unsupported type', async () => {
  const wrapper = setup()
  await choose(wrapper, new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.emitted('invalid')?.[0]).toEqual([
    'รองรับเฉพาะไฟล์ JPEG, PNG, WebP, AVIF หรือ GIF',
  ])
})

test('clears a local rejection once a valid file is chosen', async () => {
  const wrapper = setup()
  await choose(wrapper, new File(['x'], 'a.svg', { type: 'image/svg+xml' }))
  await choose(wrapper, png())
  expect(wrapper.text()).not.toContain('รองรับเฉพาะไฟล์')
})

test('shows currentUrl when no file is chosen', () => {
  const wrapper = setup({ currentUrl: '/uploads/shop.jpg' })
  expect(wrapper.get('img').attributes('src')).toBe('/uploads/shop.jpg')
  expect(createObjectURL).not.toHaveBeenCalled()
})

test('shows an empty box with a choose button when there is no image', () => {
  const wrapper = setup()
  expect(wrapper.find('img').exists()).toBe(false)
  expect(wrapper.text()).toContain('เลือกรูป')
})

test('shows the error prop', () => {
  const wrapper = setup({ error: 'กรุณาเลือกรูป' })
  expect(wrapper.text()).toContain('กรุณาเลือกรูป')
})

test('binds the label to an input that accepts the allowed types', () => {
  const wrapper = setup()
  const input = wrapper.get('input[type="file"]')
  expect(input.attributes('accept')).toBe(ACCEPTED_IMAGE_TYPES.join(','))
  expect(wrapper.get('label').attributes('for')).toBe(input.attributes('id'))
  expect(ACCEPTED_IMAGE_TYPES).toHaveLength(5)
})

test('revokes the previous object URL on change and on unmount', async () => {
  const wrapper = setup({ modelValue: png() })
  expect(createObjectURL).toHaveBeenCalledTimes(1)
  await wrapper.setProps({ modelValue: null })
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  await wrapper.setProps({ modelValue: png() })
  revokeObjectURL.mockClear()
  wrapper.unmount()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})

test('input is described by hint/error and aria-invalid when erroring', async () => {
  const wrapper = setup()
  const input = wrapper.get('input[type="file"]')
  expect(input.attributes('aria-invalid')).toBeUndefined()
  const hintId = input.attributes('aria-describedby')!
  expect(wrapper.get(`#${CSS.escape(hintId)}`).text()).toBe(
    'รองรับ JPEG, PNG, WebP, AVIF หรือ GIF ไม่เกิน 5 MB',
  )
  await wrapper.setProps({ error: 'กรุณาเลือกรูป' })
  expect(input.attributes('aria-invalid')).toBe('true')
  const ids = input.attributes('aria-describedby')!.split(' ')
  expect(ids).toHaveLength(2)
  const errorEl = wrapper.get('[role="alert"]')
  expect(ids).toContain(errorEl.attributes('id'))
})

test('stale local error clears when parent resets modelValue to null', async () => {
  const wrapper = setup()
  await choose(wrapper, new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }))
  expect(wrapper.text()).toContain('รองรับเฉพาะไฟล์')
  const file = png()
  await wrapper.setProps({ modelValue: file })
  await wrapper.setProps({ modelValue: null })
  expect(wrapper.text()).not.toContain('รองรับเฉพาะไฟล์ JPEG, PNG, WebP, AVIF หรือ GIF')
})

test('the picture box is a label for the input', () => {
  const wrapper = setup()
  const id = wrapper.get('input[type="file"]').attributes('id')
  expect(wrapper.findAll(`label[for="${id}"]`)).toHaveLength(2)
})
