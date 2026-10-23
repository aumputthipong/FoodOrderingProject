import { http, HttpResponse } from 'msw'
import { ApiError } from '@/lib/api-error'
import { queryClient, shouldRetry } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { getToken, setToken } from '@/lib/token-storage'
import { makeCart, makeUser } from '../../../tests/fixtures'
import { server } from '../../../tests/msw/server'
import { useAuthStore } from './store'

test('init restores the user from a stored token', async () => {
  setToken('tok')
  server.use(
    http.get('*/api/auth/me', () => HttpResponse.json(makeUser({ role: 'merchant', shopId: 2 }))),
  )
  const auth = useAuthStore()
  await auth.init()
  expect(auth.isLoggedIn).toBe(true)
  expect(auth.isMerchant).toBe(true)
  expect(auth.hasShop).toBe(true)
})

test('init without a token does not call the API', async () => {
  const auth = useAuthStore()
  await auth.init()
  expect(auth.user).toBeNull()
  expect(auth.isLoggedIn).toBe(false)
})

test('init clears a token the server rejects', async () => {
  setToken('bad')
  server.use(
    http.get('*/api/auth/me', () =>
      HttpResponse.json({ error: { code: 'UNAUTHORIZED', message: 'no' } }, { status: 401 }),
    ),
  )
  const auth = useAuthStore()
  await auth.init()
  expect(getToken()).toBeNull()
  expect(auth.user).toBeNull()
})

test('init keeps the token on a non-401 failure', async () => {
  setToken('tok')
  server.use(http.get('*/api/auth/me', () => HttpResponse.error()))
  const auth = useAuthStore()
  await auth.init()
  expect(getToken()).toBe('tok')
  expect(auth.user).toBeNull()
})

test('init is idempotent', async () => {
  setToken('tok')
  let calls = 0
  server.use(
    http.get('*/api/auth/me', () => {
      calls += 1
      return HttpResponse.json(makeUser())
    }),
  )
  const auth = useAuthStore()
  await Promise.all([auth.init(), auth.init()])
  await auth.init()
  expect(calls).toBe(1)
})

test('login stores token and user', async () => {
  const user = makeUser({ username: 'somchai' })
  server.use(http.post('*/api/auth/login', () => HttpResponse.json({ token: 'jwt', user })))
  const auth = useAuthStore()
  const result = await auth.login({ username: 'somchai', password: 'Passw0rd' })
  expect(result).toEqual(user)
  expect(getToken()).toBe('jwt')
  expect(auth.user).toEqual(user)
})

test('signup then logs in automatically', async () => {
  const user = makeUser({ username: 'newuser' })
  let loginBody: unknown
  server.use(
    http.post('*/api/auth/signup', () => HttpResponse.json(user, { status: 201 })),
    http.post('*/api/auth/login', async ({ request }) => {
      loginBody = await request.json()
      return HttpResponse.json({ token: 'jwt2', user })
    }),
  )
  const auth = useAuthStore()
  const result = await auth.signup({
    username: 'newuser',
    password: 'Passw0rd',
    confirmPassword: 'Passw0rd',
    firstName: 'New',
    lastName: 'User',
    email: 'n@example.com',
    mobile: '0812345678',
    role: 'customer',
  })
  expect(loginBody).toEqual({ username: 'newuser', password: 'Passw0rd' })
  expect(result).toEqual(user)
  expect(getToken()).toBe('jwt2')
  expect(auth.user).toEqual(user)
})

test('logout clears token, user and query cache even if the API fails', async () => {
  setToken('tok')
  const auth = useAuthStore()
  auth.user = makeUser()
  queryClient.setQueryData(queryKeys.cart, [makeCart()])
  server.use(http.post('*/api/auth/logout', () => HttpResponse.error()))
  await auth.logout()
  expect(getToken()).toBeNull()
  expect(auth.user).toBeNull()
  expect(queryClient.getQueryData(queryKeys.cart)).toBeUndefined()
})

test('refreshMe reloads the user', async () => {
  server.use(http.get('*/api/auth/me', () => HttpResponse.json(makeUser({ shopId: 5 }))))
  const auth = useAuthStore()
  await auth.refreshMe()
  expect(auth.user?.shopId).toBe(5)
})

test('shouldRetry never retries 4xx', () => {
  expect(shouldRetry(0, new ApiError(404, 'NOT_FOUND', 'x'))).toBe(false)
  expect(shouldRetry(0, new ApiError(400, 'VALIDATION_ERROR', 'x'))).toBe(false)
  expect(shouldRetry(0, new ApiError(499, 'INTERNAL_ERROR', 'x'))).toBe(false)
  expect(shouldRetry(0, new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe(true)
  expect(shouldRetry(1, new ApiError(500, 'INTERNAL_ERROR', 'x'))).toBe(false)
  expect(shouldRetry(0, new Error('boom'))).toBe(true)
  expect(shouldRetry(1, new Error('boom'))).toBe(false)
})
