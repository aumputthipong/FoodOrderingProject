import type { Router } from 'vue-router'
import { configureApiClient } from '@/lib/api-client'
import { getToken } from '@/lib/token-storage'
import { useAuthStore } from './store'

export function setupApiAuth(router: Router): void {
  configureApiClient({
    getToken,
    onUnauthorized: () => {
      useAuthStore().clearSession()
      const current = router.currentRoute.value
      if (current.name === 'login') return
      void router.push({ name: 'login', query: { redirect: current.fullPath } })
    },
  })
}
