import { mountApp } from '../tests/mount-app'
import { makeUser } from '../tests/fixtures'

test('/ renders the customer layout with both navs', async () => {
  const { wrapper } = await mountApp({ path: '/' })
  expect(wrapper.find('[data-testid="top-nav"]').exists()).toBe(true)
  expect(wrapper.find('[data-testid="bottom-nav"]').exists()).toBe(true)
  expect(wrapper.text()).toContain('หน้าแรก')
})

test('/login renders the auth layout without customer navs', async () => {
  const { wrapper, router } = await mountApp({ path: '/login' })
  expect(router.currentRoute.value.name).toBe('login')
  expect(wrapper.find('[data-testid="bottom-nav"]').exists()).toBe(false)
  expect(wrapper.find('[data-testid="auth-layout"]').exists()).toBe(true)
})

test('merchant routes render the merchant layout', async () => {
  const { wrapper } = await mountApp({
    path: '/merchant/queue',
    user: makeUser({ role: 'merchant', shopId: 5 }),
  })
  expect(wrapper.find('[data-testid="merchant-sidebar"]').exists()).toBe(true)
})

test('unknown paths render the not-found page', async () => {
  const { wrapper } = await mountApp({ path: '/nope/nothing' })
  expect(wrapper.text()).toContain('ไม่พบหน้าที่ค้นหา')
})

test('/merchant redirects to the queue for a merchant with a shop', async () => {
  const { router } = await mountApp({
    path: '/merchant',
    user: makeUser({ role: 'merchant', shopId: 5 }),
  })
  expect(router.currentRoute.value.name).toBe('merchant-queue')
})
