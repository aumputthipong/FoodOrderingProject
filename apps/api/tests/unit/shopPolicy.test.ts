import { canManageShop } from '../../src/common/policies/shopPolicy'

test('owner and admin can manage, others cannot', () => {
  expect(canManageShop({ id: 1, role: 'merchant' }, { ownerId: 1 })).toBe(true)
  expect(canManageShop({ id: 9, role: 'admin' }, { ownerId: 1 })).toBe(true)
  expect(canManageShop({ id: 2, role: 'merchant' }, { ownerId: 1 })).toBe(false)
})
