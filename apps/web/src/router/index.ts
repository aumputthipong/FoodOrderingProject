import { createRouter, createWebHistory, type Router, type RouterHistory } from 'vue-router'
import { useAuthStore } from '@/features/auth'
import { resolveGuard } from './guards'
import { routes } from './routes'

export function createAppRouter(history: RouterHistory = createWebHistory()): Router {
  const router = createRouter({
    history,
    routes,
    scrollBehavior: () => ({ top: 0 }),
  })

  router.beforeEach(async (to) => {
    const auth = useAuthStore()
    await auth.init()
    return resolveGuard(to, auth.user)
  })

  return router
}
