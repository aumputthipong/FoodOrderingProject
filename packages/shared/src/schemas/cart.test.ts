import { cartQuerySchema, replaceCartItemsSchema, updateCartItemSchema } from './cart'

test('accepts a valid item list and an empty one', () => {
  expect(
    replaceCartItemsSchema.safeParse({
      items: [
        { productId: 1, quantity: 1 },
        { productId: 2, quantity: 99 },
      ],
    }).success,
  ).toBe(true)
  expect(replaceCartItemsSchema.safeParse({ items: [] }).success).toBe(true)
})

test('rejects duplicate productIds', () => {
  const r = replaceCartItemsSchema.safeParse({
    items: [
      { productId: 1, quantity: 1 },
      { productId: 1, quantity: 2 },
    ],
  })
  expect(r.success).toBe(false)
  if (!r.success) expect(r.error.issues[0]?.path).toEqual(['items'])
})

test.each([
  ['zero quantity', { productId: 1, quantity: 0 }],
  ['quantity above 99', { productId: 1, quantity: 100 }],
  ['fractional quantity', { productId: 1, quantity: 1.5 }],
  ['zero productId', { productId: 0, quantity: 1 }],
  ['string productId', { productId: '1', quantity: 1 }],
])('rejects %s', (_name, item) => {
  expect(replaceCartItemsSchema.safeParse({ items: [item] }).success).toBe(false)
})

test('updateCartItemSchema requires quantity 1..99', () => {
  expect(updateCartItemSchema.safeParse({ quantity: 1 }).success).toBe(true)
  expect(updateCartItemSchema.safeParse({ quantity: 99 }).success).toBe(true)
  expect(updateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(false)
  expect(updateCartItemSchema.safeParse({ quantity: -1 }).success).toBe(false)
  expect(updateCartItemSchema.safeParse({ quantity: 100 }).success).toBe(false)
  expect(updateCartItemSchema.safeParse({}).success).toBe(false)
})

test('cartQuerySchema coerces an optional shopId', () => {
  expect(cartQuerySchema.parse({})).toEqual({})
  expect(cartQuerySchema.parse({ shopId: '3' })).toEqual({ shopId: 3 })
  expect(cartQuerySchema.safeParse({ shopId: '0' }).success).toBe(false)
  expect(cartQuerySchema.safeParse({ shopId: 'x' }).success).toBe(false)
})
