import { VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises, mount } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { createPinia } from 'pinia'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { toast } from 'vue-sonner'
import { useAuthStore } from '@/features/auth'
import { queryClient } from '@/lib/query-client'
import { setToken } from '@/lib/token-storage'
import { makeCart, makeUser } from '../../../../tests/fixtures'
import { server } from '../../../../tests/msw/server'
import { DEBOUNCE_MS, useShopCartDraft } from './useShopCartDraft'

type Put = { items: { productId: number; quantity: number }[] }

function serverCart(quantity: number) {
  return makeCart({
    id: 1,
    shop: { id: 1, name: 'ร้านข้าวมันไก่', imageUrl: null },
    items: [
      {
        id: 1,
        productId: 1,
        name: 'ข้าวมันไก่',
        imageUrl: null,
        price: 50,
        quantity,
        subtotal: 50 * quantity,
      },
    ],
    totalPrice: 50 * quantity,
  })
}

function setup(
  onError: (e: unknown) => void = () => {},
  isAvailable?: (productId: number) => boolean,
) {
  let draft!: ReturnType<typeof useShopCartDraft>
  const Host = defineComponent({
    setup() {
      draft = useShopCartDraft(1, { onError, isAvailable })
      return () => h('div')
    },
  })
  const pinia = createPinia()
  useAuthStore(pinia).user = makeUser()
  mount(Host, { global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] } })
  return draft
}

function trackPuts(): Put[] {
  const puts: Put[] = []
  server.use(
    http.put('*/api/cart/shops/1/items', async ({ request }) => {
      puts.push((await request.json()) as Put)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  return puts
}

beforeEach(() => {
  setToken('test-token')
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  vi.useRealTimers()
})

test('three quick taps send one PUT with the final quantity', async () => {
  const puts = trackPuts()
  const draft = setup()
  await flushPromises()
  draft.setQuantity(1, 1)
  draft.setQuantity(1, 2)
  draft.setQuantity(1, 3)
  expect(draft.quantities.value).toEqual({ 1: 3 })
  expect(draft.itemCount.value).toBe(3)
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS - 1)
  expect(puts).toHaveLength(0)
  await vi.advanceTimersByTimeAsync(1)
  await vi.waitFor(() => expect(puts).toHaveLength(1))
  expect(puts[0]).toEqual({ items: [{ productId: 1, quantity: 3 }] })
})

test('a change during an in-flight PUT is sent after it finishes, never in parallel', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  const puts: Put[] = []
  let current = 0
  let max = 0
  server.use(
    http.put('*/api/cart/shops/1/items', async ({ request }) => {
      puts.push((await request.json()) as Put)
      current++
      max = Math.max(max, current)
      if (puts.length === 1) await gate
      current--
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const draft = setup()
  await flushPromises()
  draft.setQuantity(1, 1)
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  await vi.waitFor(() => expect(puts).toHaveLength(1))
  draft.setQuantity(1, 5)
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  await flushPromises()
  expect(puts).toHaveLength(1)
  release()
  await vi.waitFor(() => expect(puts).toHaveLength(2))
  expect(puts[1]).toEqual({ items: [{ productId: 1, quantity: 5 }] })
  expect(max).toBe(1)
})

test('quantity 0 removes the product from the payload, items sorted by productId', async () => {
  const puts = trackPuts()
  const draft = setup()
  await flushPromises()
  draft.setQuantity(3, 1)
  draft.setQuantity(2, 4)
  draft.setQuantity(1, 2)
  draft.setQuantity(1, 0)
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  await vi.waitFor(() => expect(puts).toHaveLength(1))
  expect(puts[0]).toEqual({
    items: [
      { productId: 2, quantity: 4 },
      { productId: 3, quantity: 1 },
    ],
  })
})

test('quantity is clamped to 0-99', async () => {
  const draft = setup()
  await flushPromises()
  draft.setQuantity(1, 150)
  expect(draft.quantities.value[1]).toBe(99)
  draft.setQuantity(1, -4)
  expect(draft.quantities.value[1]).toBeUndefined()
})

test('on error, quantities revert to the server cart and onError is called', async () => {
  server.use(
    http.get('*/api/cart', () => HttpResponse.json([serverCart(2)])),
    http.put('*/api/cart/shops/1/items', () =>
      HttpResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'x' } }, { status: 400 }),
    ),
  )
  const onError = vi.fn()
  const draft = setup(onError)
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 2 }))
  draft.setQuantity(1, 9)
  expect(draft.quantities.value).toEqual({ 1: 9 })
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1))
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 2 }))
})

test('server data does not overwrite unsent local edits', async () => {
  let cart = serverCart(2)
  server.use(http.get('*/api/cart', () => HttpResponse.json([cart])))
  const draft = setup()
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 2 }))
  draft.setQuantity(1, 7)
  cart = serverCart(4)
  await queryClient.invalidateQueries({ queryKey: ['cart'] })
  await flushPromises()
  expect(draft.quantities.value).toEqual({ 1: 7 })
})

test('server data re-syncs when there are no local edits', async () => {
  let cart = serverCart(2)
  server.use(http.get('*/api/cart', () => HttpResponse.json([cart])))
  const draft = setup()
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 2 }))
  cart = serverCart(4)
  await queryClient.invalidateQueries({ queryKey: ['cart'] })
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 4 }))
})

test('edits before the cart has loaded are ignored, then later edits keep the existing items', async () => {
  let release!: () => void
  const gate = new Promise<void>((resolve) => (release = resolve))
  const existing = makeCart({
    id: 1,
    shop: { id: 1, name: 'ร้านข้าวมันไก่', imageUrl: null },
    items: [1, 2].map((productId) => ({
      id: productId,
      productId,
      name: `เมนู ${productId}`,
      imageUrl: null,
      price: 50,
      quantity: productId === 1 ? 2 : 1,
      subtotal: productId === 1 ? 100 : 50,
    })),
    totalPrice: 150,
  })
  server.use(
    http.get('*/api/cart', async () => {
      await gate
      return HttpResponse.json([existing])
    }),
  )
  const puts = trackPuts()
  const draft = setup()
  await flushPromises()
  expect(draft.ready.value).toBe(false)
  draft.setQuantity(1, 5)
  expect(draft.quantities.value).toEqual({})
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  expect(puts).toHaveLength(0)
  release()
  await vi.waitFor(() => expect(draft.ready.value).toBe(true))
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 2, 2: 1 }))
  draft.setQuantity(1, 3)
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  await vi.waitFor(() => expect(puts).toHaveLength(1))
  expect(puts[0]).toEqual({
    items: [
      { productId: 1, quantity: 3 },
      { productId: 2, quantity: 1 },
    ],
  })
})

test('a sold-out product in the server cart is left out of the payload and an info toast shows', async () => {
  const toastInfo = vi.spyOn(toast, 'info').mockImplementation(() => '')
  const existing = makeCart({
    id: 1,
    shop: { id: 1, name: 'ร้านข้าวมันไก่', imageUrl: null },
    items: [1, 2].map((productId) => ({
      id: productId,
      productId,
      name: `เมนู ${productId}`,
      imageUrl: null,
      price: 50,
      quantity: 1,
      subtotal: 50,
    })),
    totalPrice: 100,
  })
  server.use(http.get('*/api/cart', () => HttpResponse.json([existing])))
  const puts = trackPuts()
  const draft = setup(
    () => {},
    (id) => id !== 2,
  )
  await vi.waitFor(() => expect(draft.quantities.value).toEqual({ 1: 1, 2: 1 }))
  draft.setQuantity(1, 3)
  await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
  await vi.waitFor(() => expect(puts).toHaveLength(1))
  expect(puts[0]).toEqual({ items: [{ productId: 1, quantity: 3 }] })
  await vi.waitFor(() => expect(toastInfo).toHaveBeenCalledWith('นำเมนูที่หมดแล้วออกจากตะกร้า'))
})
