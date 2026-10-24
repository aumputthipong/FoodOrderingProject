import { createMemoryHistory } from 'vue-router'
import { makeUser } from '../../tests/fixtures'
import { resolveGuard } from './guards'
import { createAppRouter } from './index'

const router = createAppRouter(createMemoryHistory())
const customer = makeUser()
const merchantNoShop = makeUser({ role: 'merchant', shopId: null })
const merchantWithShop = makeUser({ role: 'merchant', shopId: 5 })
const adminWithShop = makeUser({ role: 'admin', shopId: 5 })

test.each([
  ['/cart', null, { name: 'login', query: { redirect: '/cart' } }],
  ['/login', customer, { name: 'home' }],
  ['/merchant/queue', null, { name: 'login', query: { redirect: '/merchant/queue' } }],
  ['/merchant/queue', customer, { name: 'home' }],
  ['/merchant/queue', merchantNoShop, { name: 'merchant-shop-new' }],
  ['/merchant/shop/new', merchantWithShop, { name: 'merchant-shop' }],
  ['/merchant/shop/new', merchantNoShop, true],
  ['/merchant/queue', adminWithShop, true],
  ['/shops/3', null, true],
  ['/', null, true],
  ['/', customer, true],
  ['/', merchantWithShop, { name: 'merchant-queue' }],
  ['/?q=ข้าว', adminWithShop, { name: 'merchant-queue' }],
  ['/login', merchantWithShop, { name: 'merchant-queue' }],
  ['/shops/3', merchantWithShop, true],
])('%s as %o', (path, user, expected) =>
  expect(resolveGuard(router.resolve(path), user)).toEqual(expected),
)
