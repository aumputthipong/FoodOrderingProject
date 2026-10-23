import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { makeUser } from './fixtures'
import { mountApp } from './mount-app'
import { server } from './msw/server'

async function fill(wrapper: VueWrapper, values: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(values)) {
    await wrapper.get(`input[name="${name}"]`).setValue(value)
  }
}

async function submit(wrapper: VueWrapper): Promise<void> {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

function loginHandler(user = makeUser({ username: 'customer1' })) {
  return http.post('*/api/auth/login', () => HttpResponse.json({ token: 'tok', user }))
}

const signupValues = {
  username: 'newuser1',
  password: 'Password123',
  confirmPassword: 'Password123',
  firstName: 'สมชาย',
  lastName: 'ใจดี',
  email: 'new@example.com',
  mobile: '0812345678',
}

test('customer login returns to the redirect target', async () => {
  server.use(loginHandler())
  const { wrapper, router } = await mountApp({ path: '/login?redirect=/shops/1' })
  await fill(wrapper, { username: 'customer1', password: 'Password123' })
  await submit(wrapper)
  await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/shops/1'))
})

test('merchant login without redirect goes to the merchant queue', async () => {
  server.use(loginHandler(makeUser({ role: 'merchant', shopId: 3 })))
  const { wrapper, router } = await mountApp({ path: '/login' })
  await fill(wrapper, { username: 'merchant1', password: 'Password123' })
  await submit(wrapper)
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('merchant-queue'))
})

test('unsafe redirect falls back to home', async () => {
  server.use(loginHandler())
  const { wrapper, router } = await mountApp({ path: '/login?redirect=//evil.com' })
  await fill(wrapper, { username: 'customer1', password: 'Password123' })
  await submit(wrapper)
  await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe('/'))
})

test('wrong password shows the Thai message', async () => {
  server.use(
    http.post('*/api/auth/login', () =>
      HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid' } }, { status: 401 }),
    ),
  )
  const { wrapper, router } = await mountApp({ path: '/login' })
  await fill(wrapper, { username: 'customer1', password: 'wrong' })
  await submit(wrapper)
  await vi.waitFor(() => expect(wrapper.text()).toContain('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'))
  expect(router.currentRoute.value.name).toBe('login')
})

test('login page links to signup keeping the redirect', async () => {
  const { wrapper } = await mountApp({ path: '/login?redirect=/cart' })
  const link = wrapper.get('a[href^="/signup"]')
  expect(link.attributes('href')).toBe('/signup?redirect=/cart')
})

test('signup 409 shows the error under username', async () => {
  server.use(
    http.post('*/api/auth/signup', () =>
      HttpResponse.json({ error: { code: 'CONFLICT', message: 'Taken' } }, { status: 409 }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/signup' })
  await fill(wrapper, signupValues)
  await submit(wrapper)
  await vi.waitFor(() => expect(wrapper.text()).toContain('ชื่อผู้ใช้นี้ถูกใช้แล้ว'))
})

test('signup validates on the client in Thai before sending', async () => {
  const requests = vi.fn()
  server.use(
    http.post('*/api/auth/signup', () => {
      requests()
      return HttpResponse.json({}, { status: 201 })
    }),
  )
  const { wrapper } = await mountApp({ path: '/signup' })
  await fill(wrapper, { ...signupValues, mobile: '123' })
  await submit(wrapper)
  await vi.waitFor(() =>
    expect(wrapper.text()).toContain('เบอร์มือถือต้องเป็นตัวเลข 10 หลักขึ้นต้นด้วย 0'),
  )
  expect(requests).not.toHaveBeenCalled()
})

test('new merchant signup logs in and continues to shop creation', async () => {
  const merchant = makeUser({ role: 'merchant', shopId: null })
  server.use(
    http.post('*/api/auth/signup', () => HttpResponse.json(merchant, { status: 201 })),
    loginHandler(merchant),
  )
  const { wrapper, router } = await mountApp({ path: '/signup' })
  await fill(wrapper, signupValues)
  await wrapper.get('button[role="radio"][value="merchant"]').trigger('click')
  await submit(wrapper)
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('merchant-shop-new'))
})

test('account shows the profile in Thai and merchants can open their shop', async () => {
  const { wrapper } = await mountApp({
    path: '/account',
    user: makeUser({ role: 'merchant', shopId: 3 }),
  })
  expect(wrapper.text()).toContain('สมชาย ใจดี')
  expect(wrapper.text()).toContain('somchai@example.com')
  expect(wrapper.text()).toContain('ร้านค้า')
  expect(wrapper.text()).toContain('จัดการร้านของฉัน')
})

test('logout from account returns home and hides account links', async () => {
  server.use(http.post('*/api/auth/logout', () => new HttpResponse(null, { status: 204 })))
  const { wrapper, router } = await mountApp({ path: '/account', user: makeUser() })
  expect(wrapper.text()).not.toContain('จัดการร้านของฉัน')
  const button = wrapper.findAll('button').find((b) => b.text().includes('ออกจากระบบ'))
  await button!.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.name).toBe('home')
  await vi.waitFor(() => expect(wrapper.find('a[href="/login"]').exists()).toBe(true))
  expect(wrapper.text()).not.toContain('somchai')
})
