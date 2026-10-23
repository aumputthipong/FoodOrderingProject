import { flushPromises } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { api } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
import { getToken, setToken } from '@/lib/token-storage'
import { makeCart, makeUser } from '../../../tests/fixtures'
import { mountApp } from '../../../tests/mount-app'
import { server } from '../../../tests/msw/server'

const unauthorizedBody = { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }

test('a 401 during use clears the session and sends the user to login with a redirect', async () => {
  const { router } = await mountApp({ path: '/cart', user: makeUser() })
  expect(router.currentRoute.value.name).toBe('cart')
  queryClient.setQueryData(queryKeys.cart, [makeCart()])
  server.use(http.get('*/api/cart', () => HttpResponse.json(unauthorizedBody, { status: 401 })))

  await api.get('/api/cart', { schema: z.unknown() }).catch(() => {})
  await flushPromises()

  expect(router.currentRoute.value.name).toBe('login')
  expect(router.currentRoute.value.query.redirect).toBe('/cart')
  expect(getToken()).toBeNull()
  expect(queryClient.getQueryData(queryKeys.cart)).toBeUndefined()
})

describe('stale token at startup', () => {
  beforeEach(() => {
    setToken('stale')
    server.use(
      http.get('*/api/auth/me', () => HttpResponse.json(unauthorizedBody, { status: 401 })),
    )
  })

  test('a deep link to a protected page keeps its target in the login redirect', async () => {
    const { router } = await mountApp({ path: '/cart' })
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/cart')
    expect(getToken()).toBeNull()
  })

  test('a public page stays put', async () => {
    const { router } = await mountApp({ path: '/' })
    expect(router.currentRoute.value.name).toBe('home')
    expect(getToken()).toBeNull()
  })
})
