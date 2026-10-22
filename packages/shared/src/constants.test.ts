import { ROLES, SIGNUP_ROLES, PRODUCT_STATUSES, ORDER_STATUSES } from './constants'
test('signup roles exclude admin', () => {
  expect(SIGNUP_ROLES).toEqual(['customer', 'merchant'])
  expect(ROLES).toEqual(['customer', 'merchant', 'admin'])
})
test('statuses match the database enums', () => {
  expect(PRODUCT_STATUSES).toEqual(['available', 'not-available'])
  expect(ORDER_STATUSES).toEqual(['waiting', 'finished'])
})
