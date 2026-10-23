import { enableAutoUnmount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { z } from 'zod'
import { queryClient } from '@/lib/query-client'
import { server } from './msw/server'

z.config(z.locales.th())

enableAutoUnmount(afterEach)

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
  // jsdom does not implement scrolling; the router's scrollBehavior calls it
  window.scrollTo = () => {}
})

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  queryClient.clear()
})

afterAll(() => server.close())
