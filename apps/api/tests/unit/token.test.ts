import { generateToken, hashToken } from '../../src/modules/auth/token'

test('generates 64-char hex tokens that differ', () => {
  expect(generateToken()).toMatch(/^[0-9a-f]{64}$/)
  expect(generateToken()).not.toBe(generateToken())
})

test('hashToken is sha256 hex', () => {
  expect(hashToken('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
