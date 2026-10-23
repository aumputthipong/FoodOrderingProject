import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useAuthStore } from '@/features/auth'
import { queryKeys } from '@/lib/query-keys'
import { getCarts } from './api'

export function useCartsQuery() {
  const auth = useAuthStore()
  return useQuery({
    queryKey: queryKeys.cart,
    queryFn: getCarts,
    enabled: computed(() => auth.isLoggedIn),
  })
}

export function useCartCount() {
  const { data } = useCartsQuery()
  return computed(() =>
    (data.value ?? []).reduce(
      (total, cart) => total + cart.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    ),
  )
}
