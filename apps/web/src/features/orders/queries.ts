import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { cartErrorMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import { checkout, getMyOrders } from './api'

export const QUEUE_REFETCH_MS = 15_000

export function useMyOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.orders.mine,
    queryFn: getMyOrders,
    refetchInterval: QUEUE_REFETCH_MS,
    refetchOnWindowFocus: true,
  })
}

export function useCheckoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: checkout,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.mine }),
      ])
    },
    onError: (error) => {
      toast.error(cartErrorMessage(error))
    },
  })
}
