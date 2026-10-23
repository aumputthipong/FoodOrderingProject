import type { OrderStatus, ShopOrder, ShopOrderList } from '@canteen/shared'
import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { QUEUE_REFETCH_MS } from '@/features/orders'
import { errorMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import { getShopOrders, setOrderItemDone, setOrderStatus } from './api'

const TOGGLE_KEY = ['orders', 'shop', 'toggle'] as const

export function useShopOrdersQuery() {
  const toggling = useIsMutating({ mutationKey: TOGGLE_KEY })
  return useQuery({
    queryKey: queryKeys.orders.shop,
    queryFn: getShopOrders,
    // a poll that starts while a tick is in flight would return pre-tick data and revert it
    refetchInterval: () => (toggling.value > 0 ? false : QUEUE_REFETCH_MS),
    refetchOnWindowFocus: true,
  })
}

function withItemDone(list: ShopOrderList, itemId: number, isDone: boolean): ShopOrderList {
  const patch = (order: ShopOrder): ShopOrder => ({
    ...order,
    items: order.items.map((item) => (item.id === itemId ? { ...item, isDone } : item)),
  })
  return { waiting: list.waiting.map(patch), finished: list.finished.map(patch) }
}

export function useToggleOrderItemMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: TOGGLE_KEY,
    mutationFn: (vars: { itemId: number; isDone: boolean }) =>
      setOrderItemDone(vars.itemId, vars.isDone),
    onMutate: async ({ itemId, isDone }) => {
      // stop an in-flight poll from overwriting the optimistic write
      await queryClient.cancelQueries({ queryKey: queryKeys.orders.shop })
      const snapshot = queryClient.getQueryData<ShopOrderList>(queryKeys.orders.shop)
      if (snapshot) {
        queryClient.setQueryData<ShopOrderList>(
          queryKeys.orders.shop,
          withItemDone(snapshot, itemId, isDone),
        )
      }
      return { snapshot }
    },
    onError: (error, _vars, context) => {
      if (context?.snapshot) queryClient.setQueryData(queryKeys.orders.shop, context.snapshot)
      toast.error(errorMessage(error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.shop }),
  })
}

export function useSetOrderStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: OrderStatus }) => setOrderStatus(vars.id, vars.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.orders.shop }),
    onError: (error) => {
      toast.error(errorMessage(error))
    },
  })
}
