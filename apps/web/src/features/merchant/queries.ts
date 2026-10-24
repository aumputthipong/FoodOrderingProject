import type {
  OrderStatus,
  ProductStatus,
  ShopDetail,
  ShopOrder,
  ShopOrderList,
} from '@canteen/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/features/auth'
import { QUEUE_REFETCH_MS } from '@/features/orders'
import { errorMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import {
  createProduct,
  createShop,
  getShopOrders,
  setOrderItemDone,
  setOrderStatus,
  setProductStatus,
  updateProduct,
  updateShop,
} from './api'

const TOGGLE_KEY = ['orders', 'shop', 'toggle'] as const

export function useShopOrdersQuery(enabled: () => boolean = () => true) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: queryKeys.orders.shop,
    enabled,
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

export function useCreateShopMutation() {
  const queryClient = useQueryClient()
  const auth = useAuthStore()
  return useMutation({
    mutationFn: (form: FormData) => createShop(form),
    onSuccess: async (shop) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.all })
      try {
        await auth.refreshMe()
      } catch {
        // the shop exists, so a failed /me must not fail the mutation: link it locally instead
        if (auth.user) auth.user = { ...auth.user, shopId: shop.id }
      }
    },
  })
}

export function useUpdateShopMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; form: FormData }) => updateShop(vars.id, vars.form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.shops.all }),
  })
}

export function useSaveProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    // no productId creates a new product in the shop, otherwise updates that product
    mutationFn: (vars: { shopId: number; productId?: number; form: FormData }) =>
      vars.productId === undefined
        ? createProduct(vars.shopId, vars.form)
        : updateProduct(vars.productId, vars.form),
    onSuccess: (_product, vars) =>
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(vars.shopId) }),
  })
}

export function useSetProductStatusMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (vars: { shopId: number; id: number; status: ProductStatus }) =>
      setProductStatus(vars.id, vars.status),
    onMutate: async ({ shopId, id, status }) => {
      const key = queryKeys.shops.detail(shopId)
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData<ShopDetail>(key)
      if (snapshot) {
        queryClient.setQueryData<ShopDetail>(key, {
          ...snapshot,
          products: snapshot.products.map((p) => (p.id === id ? { ...p, status } : p)),
        })
      }
      return { snapshot }
    },
    onError: (error, { shopId }, context) => {
      if (context?.snapshot) {
        queryClient.setQueryData(queryKeys.shops.detail(shopId), context.snapshot)
      }
      toast.error(errorMessage(error))
    },
    // not returned: the mutation must be settled when this refetch lands
    onSettled: (_data, _error, { shopId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.shops.detail(shopId) })
    },
  })
}
