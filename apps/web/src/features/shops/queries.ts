import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { queryKeys } from '@/lib/query-keys'
import { getShop, getShops } from './api'

export function useShopsQuery(search: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => queryKeys.shops.list(toValue(search))),
    queryFn: () => getShops(toValue(search)),
  })
}

export function useShopQuery(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.shops.detail(toValue(id) ?? 0)),
    queryFn: () => getShop(toValue(id) as number),
    enabled: computed(() => toValue(id) !== null),
  })
}
