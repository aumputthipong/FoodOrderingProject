import { makeUser } from '../../../tests/fixtures'
import { homeFor, safeRedirect } from './redirect'

test.each(['//evil.com', 'https://evil.com', 'javascript:alert(1)', '/\\evil.com', 42, undefined])(
  'rejects %s',
  (value) => expect(safeRedirect(value)).toBeNull(),
)

test('accepts internal paths', () => expect(safeRedirect('/shops/3?x=1')).toBe('/shops/3?x=1'))

test.each([
  ['customer', { name: 'home' }],
  ['merchant', { name: 'merchant-queue' }],
  ['admin', { name: 'merchant-queue' }],
] as const)('homeFor %s', (role, expected) => expect(homeFor(makeUser({ role }))).toEqual(expected))
