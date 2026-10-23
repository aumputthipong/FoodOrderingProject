import type { LoginInput, SignupInput, User } from '@canteen/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { isApiError } from '@/lib/api-error'
import { queryClient } from '@/lib/query-client'
import { clearToken, getToken, setToken } from '@/lib/token-storage'
import * as authApi from './api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  let initPromise: Promise<void> | null = null

  const isLoggedIn = computed(() => user.value !== null)
  const isMerchant = computed(() => user.value?.role === 'merchant' || user.value?.role === 'admin')
  const hasShop = computed(() => user.value !== null && user.value.shopId !== null)

  function clearSession(): void {
    clearToken()
    user.value = null
    queryClient.clear()
  }

  function init(): Promise<void> {
    initPromise ??= (async () => {
      if (!getToken()) return
      try {
        user.value = await authApi.fetchMe()
      } catch (error) {
        if (isApiError(error) && error.status === 401) clearSession()
        else user.value = null
      }
    })()
    return initPromise
  }

  async function login(input: LoginInput): Promise<User> {
    const response = await authApi.login(input)
    setToken(response.token)
    user.value = response.user
    return response.user
  }

  async function signup(input: SignupInput): Promise<User> {
    await authApi.signup(input)
    return login({ username: input.username, password: input.password })
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout()
    } catch {
      // the session is cleared locally regardless of the server result
    }
    clearSession()
  }

  async function refreshMe(): Promise<void> {
    user.value = await authApi.fetchMe()
  }

  return {
    user,
    isLoggedIn,
    isMerchant,
    hasShop,
    init,
    login,
    signup,
    logout,
    refreshMe,
    clearSession,
  }
})
