import { shopFieldsSchema } from './shop'

test('trims name and description', () => {
  expect(shopFieldsSchema.parse({ name: '  Noodles ', description: ' Tasty ' })).toEqual({
    name: 'Noodles',
    description: 'Tasty',
  })
})

test.each([
  ['blank name', { name: '   ', description: 'd' }],
  ['name too long', { name: 'a'.repeat(256), description: 'd' }],
  ['empty description', { name: 'n', description: '' }],
  ['description too long', { name: 'n', description: 'a'.repeat(2001) }],
])('rejects %s', (_name, input) => {
  expect(shopFieldsSchema.safeParse(input).success).toBe(false)
})
