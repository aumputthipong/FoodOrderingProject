import { toFormData } from './form-data'

test('adds string fields and the image when present', () => {
  const image = new File(['x'], 'a.png', { type: 'image/png' })
  const fd = toFormData({ name: 'ผัดไทย', price: 45 }, image)
  expect(fd.get('name')).toBe('ผัดไทย')
  expect(fd.get('price')).toBe('45')
  expect((fd.get('image') as File).name).toBe('a.png')
})

test('omits the image field without an image', () => {
  const fd = toFormData({ name: 'x' }, null)
  expect(fd.has('image')).toBe(false)
})
