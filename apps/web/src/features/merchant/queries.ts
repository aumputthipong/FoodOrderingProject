import type { OrderStatus, ShopOrder, ShopOrderList } from '@canteen/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { QUEUE_REFETCH_MS } from '@/features/orders'
import { errorMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import { getShopOrders, setOrderItemDone, setOrderStatus } from './api'

const TOGGLE_KEY = ['orders', 'shop', 'toggle'] as const

export function useShopOrdersQuery() {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.orders.shop,
    queryFn: async () => {
      const fetched = await getShopOrders()
      // a response that lands while a tick is in flight predates it (poll, focus or an earlier
      // toggle's refetch), so keep the optimistic cache instead of reverting the tick
      if (queryClient.isMutating({ mutationKey: TOGGLE_KEY }) > 0) {
        return queryClient.getQueryData<ShopOrderList>(queryKeys.orders.shop) ?? fetched
      }
      return fetched
    },
    refetchInterval: QUEUE_REFETCH_MS,
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
    // not returned: the mutation must be settled when this refetch lands, or it is discarded
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.shop })
    },
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
