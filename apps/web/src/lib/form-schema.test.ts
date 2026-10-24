import { loginSchema, productFieldsSchema, shopFieldsSchema, signupSchema } from '@canteen/shared'
import { toFormSchema } from './form-schema'

const validSignup = {
  username: 'somchai1',
  password: 'Passw0rdX',
  confirmPassword: 'Passw0rdX',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  email: 'a@b.co',
  mobile: '0812345678',
  role: 'customer' as const,
}

test('returns parsed value on success', async () => {
  const r = await toFormSchema(productFieldsSchema).parse({
    name: 'ผัดไทย',
    description: 'อร่อย',
    price: '45',
  })
  expect(r.errors).toEqual([])
  expect(r.value).toEqual({ name: 'ผัดไทย', description: 'อร่อย', price: 45 })
})

test('groups issues by dotted path and translates them', async () => {
  const schema = toFormSchema(signupSchema)
  expect(schema.__type).toBe('VVTypedSchema')
  const r = await schema.parse({ ...validSignup, confirmPassword: 'x' })
  expect(r.errors).toContainEqual({ path: 'confirmPassword', errors: ['รหัสผ่านไม่ตรงกัน'] })
})

test('groups several issues on the same path together', async () => {
  const r = await toFormSchema(signupSchema).parse({
    ...validSignup,
    password: 'abc',
    confirmPassword: 'abc',
  })
  const entry = r.errors.find((e) => e.path === 'password')
  expect(entry?.errors).toContain('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
  expect(entry?.errors).toContain('รหัสผ่านต้องมีตัวพิมพ์ใหญ่')
  expect(entry?.errors).toContain('รหัสผ่านต้องมีตัวเลข')
})

test('empty required fields read as human Thai', async () => {
  const r = await toFormSchema(loginSchema).parse({} as never)
  expect(r.errors).toContainEqual({ path: 'username', errors: ['กรุณากรอกข้อมูลนี้'] })
})

test('empty price says กรุณากรอกราคา', async () => {
  const r = await toFormSchema(productFieldsSchema).parse({ name: 'a', description: 'b' } as never)
  expect(r.errors).toContainEqual({ path: 'price', errors: ['กรุณากรอกราคา'] })
})

test('empty string on min(1) field is also กรุณากรอกข้อมูลนี้', async () => {
  const r = await toFormSchema(shopFieldsSchema).parse({ name: '', description: 'x' })
  expect(r.errors).toContainEqual({ path: 'name', errors: ['กรุณากรอกข้อมูลนี้'] })
})

test('cleared price (empty string) says กรุณากรอกราคา', async () => {
  const r = await toFormSchema(productFieldsSchema).parse({
    name: 'a',
    description: 'b',
    price: '',
  })
  expect(r.errors).toContainEqual({ path: 'price', errors: ['กรุณากรอกราคา'] })
})

test('typed price 0 keeps the specific message', async () => {
  const r = await toFormSchema(productFieldsSchema).parse({ name: 'a', description: 'b', price: 0 })
  const entry = r.errors.find((e) => e.path === 'price')
  expect(entry).toBeDefined()
  expect(entry?.errors).not.toContain('กรุณากรอกราคา')
})

test('null text field reads as กรุณากรอกข้อมูลนี้', async () => {
  const r = await toFormSchema(shopFieldsSchema).parse({ name: 'a', description: null } as never)
  expect(r.errors).toContainEqual({ path: 'description', errors: ['กรุณากรอกข้อมูลนี้'] })
})
