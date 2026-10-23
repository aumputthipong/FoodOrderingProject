import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/features/auth'
import { cartErrorMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import { getCarts, removeCartItem, updateCartItem } from './api'

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

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, quantity }: { id: number; quantity: number }) =>
      updateCartItem(id, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
    onError: (error) => {
      toast.error(cartErrorMessage(error))
    },
  })
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => removeCartItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
    onError: (error) => {
      toast.error(errorMessage(error))
    },
  })
}
