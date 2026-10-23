import { createPinia, setActivePinia } from 'pinia'
import { z } from 'zod'
import { queryClient } from '@/lib/query-client'
import { server } from './msw/server'

z.config(z.locales.th())

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  queryClient.clear()
})

afterAll(() => server.close())
