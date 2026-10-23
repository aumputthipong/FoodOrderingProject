import { useQueryClient } from '@tanstack/vue-query'
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import { toast } from 'vue-sonner'
import { cartErrorMessage } from '@/lib/error-messages'
import { queryKeys } from '@/lib/query-keys'
import { replaceCartItems } from '../api'
import { useCartsQuery } from '../queries'

export const DEBOUNCE_MS = 300
const MAX_QUANTITY = 99

export function useShopCartDraft(
  shopId: MaybeRefOrGetter<number>,
  options: {
    onError?: (error: unknown) => void
    // products known to be sold out are never sent: the server rejects the whole cart otherwise
    isAvailable?: (productId: number) => boolean
  } = {},
) {
  const onError = options.onError ?? ((error: unknown) => toast.error(cartErrorMessage(error)))
  const isAvailable = options.isAvailable ?? (() => true)
  const queryClient = useQueryClient()
  const { data: carts } = useCartsQuery()
  const quantities = ref<Record<number, number>>({})

  // dirty: edited but not yet sent; inFlight: a PUT is running; waiting: the debounce
  // elapsed while a PUT was running, so send again as soon as it finishes.
  let dirty = false
  let inFlight = false
  let waiting = false
  let timer: ReturnType<typeof setTimeout> | null = null
  // the shop is fixed for the lifetime of this instance (the page is keyed by route path)
  const fixedShopId = toValue(shopId)

  function serverQuantities(): Record<number, number> {
    const cart = carts.value?.find((c) => c.shop.id === fixedShopId)
    return Object.fromEntries((cart?.items ?? []).map((item) => [item.productId, item.quantity]))
  }

  function syncFromServer(): void {
    if (!dirty && !inFlight) quantities.value = serverQuantities()
  }

  function clearTimer(): void {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }

  async function send(): Promise<void> {
    inFlight = true
    dirty = false
    waiting = false
    const wanted = Object.entries(quantities.value)
      .map(([productId, quantity]) => ({ productId: Number(productId), quantity }))
      .filter((item) => item.quantity > 0)
    const items = wanted
      .filter((item) => isAvailable(item.productId))
      .sort((a, b) => a.productId - b.productId)
    try {
      await replaceCartItems(fixedShopId, items)
    } catch (error) {
      clearTimer()
      dirty = false
      waiting = false
      inFlight = false
      onError(error)
      await queryClient.invalidateQueries({ queryKey: queryKeys.cart })
      syncFromServer()
      return
    }
    inFlight = false
    if (items.length < wanted.length) toast.info('นำเมนูที่หมดแล้วออกจากตะกร้า')
    if (waiting) return send()
    await queryClient.invalidateQueries({ queryKey: queryKeys.cart })
    syncFromServer()
  }

  function flush(): void {
    timer = null
    if (inFlight) waiting = true
    else void send()
  }

  const ready = computed(() => carts.value !== undefined)

  function setQuantity(productId: number, quantity: number): void {
    if (!ready.value) return
    const next = Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(quantity)))
    const updated = { ...quantities.value, [productId]: next }
    if (next === 0) delete updated[productId]
    quantities.value = updated
    dirty = true
    clearTimer()
    timer = setTimeout(flush, DEBOUNCE_MS)
  }

  watch(carts, syncFromServer, { immediate: true })
  onScopeDispose(() => {
    if (!dirty) return
    clearTimer()
    flush()
  })

  const itemCount = computed(() => Object.values(quantities.value).reduce((a, b) => a + b, 0))

  return { quantities, setQuantity, itemCount, ready }
}
