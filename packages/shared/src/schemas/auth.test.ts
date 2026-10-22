import { loginSchema, signupSchema, userSchema } from './auth'

const valid = {
  username: 'somchai',
  password: 'Passw0rd',
  confirmPassword: 'Passw0rd',
  firstName: 'Som',
  lastName: 'Chai',
  email: 's@example.com',
  mobile: '0812345678',
  role: 'customer',
}

test('accepts a valid signup', () => {
  expect(signupSchema.safeParse(valid).success).toBe(true)
})

test.each([['short1A'], ['alllower1'], ['ALLUPPER1'], ['NoDigitsHere']])(
  'rejects weak password %s',
  (pw) => {
    expect(signupSchema.safeParse({ ...valid, password: pw, confirmPassword: pw }).success).toBe(
      false,
    )
  },
)

test('rejects admin role (B1)', () => {
  const r = signupSchema.safeParse({ ...valid, role: 'admin' })
  expect(r.error?.issues[0]?.path).toEqual(['role'])
})

test('reports confirmPassword mismatch on its own path', () => {
  const r = signupSchema.safeParse({ ...valid, confirmPassword: 'Other0ne' })
  expect(r.error?.issues[0]?.path).toEqual(['confirmPassword'])
})

test.each([
  ['username too short', { username: 'abcd' }],
  ['username too long', { username: 'a'.repeat(21) }],
  ['empty firstName', { firstName: '' }],
  ['firstName too long', { firstName: 'a'.repeat(151) }],
  ['empty lastName', { lastName: '' }],
  ['bad email', { email: 'not-an-email' }],
  ['email too long', { email: `${'a'.repeat(95)}@e.com` }],
  ['mobile with letters', { mobile: '08123abcde' }],
  ['mobile not starting with 0', { mobile: '1812345678' }],
  ['mobile too short', { mobile: '081234567' }],
])('rejects %s', (_name, patch) => {
  expect(signupSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
})

test('loginSchema requires username and password', () => {
  expect(loginSchema.safeParse({ username: 'a', password: 'b' }).success).toBe(true)
  expect(loginSchema.safeParse({ username: '', password: 'b' }).success).toBe(false)
  expect(loginSchema.safeParse({ username: 'a' }).success).toBe(false)
})

test('userSchema strips unknown fields such as password hashes', () => {
  const parsed = userSchema.parse({
    id: 1,
    username: 'somchai',
    firstName: 'Som',
    lastName: 'Chai',
    email: 's@example.com',
    mobile: '0812345678',
    role: 'customer',
    shopId: null,
    passwordHash: 'secret',
  })
  expect(parsed).not.toHaveProperty('passwordHash')
})
