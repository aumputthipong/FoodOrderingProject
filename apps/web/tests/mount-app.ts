import type { User } from '@canteen/shared'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { createPinia } from 'pinia'
import { createMemoryHistory, type Router } from 'vue-router'
import App from '@/App.vue'
import { setupApiAuth } from '@/features/auth/setup'
import { queryClient } from '@/lib/query-client'
import { setToken } from '@/lib/token-storage'
import { createAppRouter } from '@/router'
import { server } from './msw/server'

export async function mountApp(options: {
  path: string
  user?: User | null
}): Promise<{ wrapper: VueWrapper; router: Router }> {
  const { user } = options
  if (user) {
    setToken('test-token')
    server.use(http.get('*/api/auth/me', () => HttpResponse.json(user)))
  }
  const pinia = createPinia()
  const router = createAppRouter(createMemoryHistory())
  setupApiAuth(router)
  const wrapper = mount(App, {
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient }], router] },
  })
  await router.push(options.path)
  await router.isReady()
  await flushPromises()
  return { wrapper, router }
}
