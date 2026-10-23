import type { CartItem } from '@canteen/shared'
import type { VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { afterEach, expect, test, vi } from 'vitest'
import { toast } from 'vue-sonner'
import { QUEUE_REFETCH_MS } from '@/features/orders'
import { queryClient } from '@/lib/query-client'
import { makeCart, makeOrder, makeUser } from './fixtures'
import { mountApp } from './mount-app'
import { server } from './msw/server'

afterEach(() => {
  vi.useRealTimers()
})

function cartItem(id: number, name: string, price: number, quantity: number): CartItem {
  return { id, productId: id, name, imageUrl: null, price, quantity, subtotal: price * quantity }
}

function findButton(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll('button').find((b) => b.text().includes(label))
  expect(button, `button "${label}"`).toBeDefined()
  return button!
}

function ariaButton(wrapper: VueWrapper, label: string) {
  return wrapper.get(`button[aria-label="${label}"]`)
}

test('checkout from the cart goes to the queue and shows the new ticket', async () => {
  let ordered = false
  const body = vi.fn()
  server.use(
    http.get('*/api/cart', () => HttpResponse.json(ordered ? [] : [makeCart({ id: 5 })])),
    http.post('*/api/orders', async ({ request }) => {
      body(await request.json())
      ordered = true
      return HttpResponse.json(makeOrder({ id: 42 }), { status: 201 })
    }),
    http.get('*/api/orders/mine', () =>
      HttpResponse.json({ waiting: ordered ? [makeOrder({ id: 42 })] : [], finished: [] }),
    ),
  )
  const { wrapper, router } = await mountApp({ path: '/cart', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('สั่งอาหารร้านนี้'))
  expect(wrapper.text()).toContain('1 ร้าน · แยกสั่งทีละร้าน')
  expect(wrapper.text()).toContain('฿100')
  expect(wrapper.find('a[href="/shops/1"]').exists()).toBe(true)
  await findButton(wrapper, 'สั่งอาหารร้านนี้').trigger('click')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'))
  expect(body).toHaveBeenCalledWith({ cartId: 5 })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  expect(wrapper.text()).toContain('กำลังทำ (1)')
})

test('checkout shows กำลังสั่ง… and never flashes ตะกร้ายังว่าง before navigating', async () => {
  let ordered = false
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  // The orders refetch is held until the emptied cart has been rendered for a while.
  let releaseOrders!: () => void
  const ordersGate = new Promise<void>((resolve) => {
    releaseOrders = resolve
  })
  server.use(
    http.get('*/api/cart', () => HttpResponse.json(ordered ? [] : [makeCart({ id: 5 })])),
    http.post('*/api/orders', async () => {
      await gate
      ordered = true
      return HttpResponse.json(makeOrder({ id: 42 }), { status: 201 })
    }),
    http.get('*/api/orders/mine', async () => {
      if (ordered) await ordersGate
      return HttpResponse.json({ waiting: [], finished: [] })
    }),
  )
  const { wrapper, router } = await mountApp({ path: '/cart', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('สั่งอาหารร้านนี้'))
  await findButton(wrapper, 'สั่งอาหารร้านนี้').trigger('click')
  await vi.waitFor(() => expect(wrapper.text()).toContain('กำลังสั่ง…'))
  expect(findButton(wrapper, 'กำลังสั่ง…').attributes('disabled')).toBeDefined()
  expect(wrapper.find('.animate-spin').exists()).toBe(true)
  let flashed = false
  const observer = new MutationObserver(() => {
    if (wrapper.text().includes('ตะกร้ายังว่าง')) flashed = true
  })
  observer.observe(wrapper.element, { childList: true, subtree: true, characterData: true })
  release()
  await new Promise((resolve) => setTimeout(resolve, 150))
  releaseOrders()
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('orders'))
  observer.disconnect()
  expect(flashed).toBe(false)
  expect(wrapper.text()).not.toContain('ตะกร้ายังว่าง')
})

test('empty waiting tab says ยังไม่มีคิวที่กำลังทำ with ไปเลือกร้าน', async () => {
  server.use(
    http.get('*/api/orders/mine', () =>
      HttpResponse.json({ waiting: [], finished: [makeOrder({ id: 2, status: 'finished' })] }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/orders', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีคิวที่กำลังทำ'))
  expect(wrapper.text()).toContain('สั่งอาหารแล้วคิวจะแสดงที่นี่')
  const link = wrapper.findAll('a').find((a) => a.text().includes('ไปเลือกร้าน'))
  expect(link?.attributes('href')).toBe('/')
})

test('empty finished tab says ยังไม่มีคิวที่เสร็จ without an action', async () => {
  server.use(
    http.get('*/api/orders/mine', () =>
      HttpResponse.json({ waiting: [makeOrder({ id: 1 })], finished: [] }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/orders', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#1'))
  const tab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('เสร็จแล้ว (0)'))
  await tab!.trigger('mousedown', { button: 0 })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีคิวที่เสร็จ'))
  expect(wrapper.findAll('a').some((a) => a.text().includes('ไปเลือกร้าน'))).toBe(false)
})

test('minus at quantity 1 removes the item', async () => {
  const removed = vi.fn()
  let items = [cartItem(9, 'ไก่ทอด', 50, 1), cartItem(10, 'น้ำเปล่า', 10, 1)]
  server.use(
    http.get('*/api/cart', () => HttpResponse.json([makeCart({ id: 5, items, totalPrice: 60 })])),
    http.delete('*/api/cart/items/:id', ({ params }) => {
      removed(params.id)
      items = items.filter((i) => i.id !== 9)
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const { wrapper } = await mountApp({ path: '/cart', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไก่ทอด'))
  await ariaButton(wrapper, 'ลดจำนวน ไก่ทอด').trigger('click')
  await vi.waitFor(() => expect(removed).toHaveBeenCalledWith('9'))
  await vi.waitFor(() => expect(wrapper.text()).not.toContain('ไก่ทอด'))
  expect(wrapper.text()).toContain('น้ำเปล่า')
})

test('plus sends the new absolute quantity and the controls lock while it is pending', async () => {
  const patched: unknown[] = []
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let quantity = 2
  server.use(
    http.get('*/api/cart', () =>
      HttpResponse.json([
        makeCart({
          items: [cartItem(1, 'ข้าวมันไก่', 50, quantity)],
          totalPrice: 50 * quantity,
        }),
      ]),
    ),
    http.patch('*/api/cart/items/:id', async ({ request }) => {
      patched.push(await request.json())
      await gate
      quantity = 3
      return HttpResponse.json(cartItem(1, 'ข้าวมันไก่', 50, 3))
    }),
  )
  const { wrapper } = await mountApp({ path: '/cart', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ข้าวมันไก่'))
  await ariaButton(wrapper, 'เพิ่มจำนวน ข้าวมันไก่').trigger('click')
  await vi.waitFor(() => expect(patched).toEqual([{ quantity: 3 }]))
  await vi.waitFor(() =>
    expect(ariaButton(wrapper, 'เพิ่มจำนวน ข้าวมันไก่').attributes('disabled')).toBeDefined(),
  )
  expect(findButton(wrapper, 'สั่งอาหารร้านนี้').attributes('disabled')).toBeDefined()
  release()
  await vi.waitFor(() => expect(wrapper.text()).toContain('฿150'))
  expect(ariaButton(wrapper, 'เพิ่มจำนวน ข้าวมันไก่').attributes('disabled')).toBeUndefined()
})

test('empty cart shows the empty state', async () => {
  const { wrapper } = await mountApp({ path: '/cart', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ตะกร้ายังว่าง'))
  const link = wrapper.findAll('a').find((a) => a.text().includes('ไปเลือกร้าน'))
  expect(link?.attributes('href')).toBe('/')
})

test('no orders shows "ยังไม่มีคิวที่กำลังทำ"', async () => {
  server.use(http.get('*/api/orders/mine', () => HttpResponse.json({ waiting: [], finished: [] })))
  const { wrapper } = await mountApp({ path: '/orders', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีคิวที่กำลังทำ'))
  expect(wrapper.text()).toContain('คิวของฉัน')
  expect(wrapper.text()).toContain('กำลังทำ (0)')
  expect(wrapper.text()).toContain('เสร็จแล้ว (0)')
})

test('the finished tab lists finished orders', async () => {
  server.use(
    http.get('*/api/orders/mine', () =>
      HttpResponse.json({
        waiting: [makeOrder({ id: 1 })],
        finished: [
          makeOrder({ id: 2, status: 'finished', finishedAt: '2026-01-01T03:30:00.000Z' }),
        ],
      }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/orders', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#1'))
  expect(wrapper.text()).not.toContain('#2')
  const tab = wrapper.findAll('[role="tab"]').find((t) => t.text().includes('เสร็จแล้ว (1)'))
  await tab!.trigger('mousedown', { button: 0 })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#2'))
})

test('my orders refetches every 15 seconds', async () => {
  const requests = vi.fn()
  server.use(
    http.get('*/api/orders/mine', () => {
      requests()
      return HttpResponse.json({ waiting: [makeOrder({ id: 42 })], finished: [] })
    }),
  )
  // fake only timers (not promises/microtasks) so TanStack's interval is on the fake clock
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
  const { wrapper } = await mountApp({ path: '/orders', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  expect(requests).toHaveBeenCalledTimes(1)
  // the interval is configured on the live observer
  const query = queryClient.getQueryCache().find({ queryKey: ['orders', 'mine'] })
  expect(QUEUE_REFETCH_MS).toBe(15_000)
  expect(query?.observers[0]?.options.refetchInterval).toBe(15_000)
  expect(query?.observers[0]?.options.refetchOnWindowFocus).toBe(true)
  // and it actually fires
  await vi.advanceTimersByTimeAsync(14_000)
  expect(requests).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1_500)
  await vi.waitFor(() => expect(requests).toHaveBeenCalledTimes(2))
})

test('checkout rejected for a sold-out item shows the translated reason', async () => {
  const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
  server.use(
    http.get('*/api/cart', () => HttpResponse.json([makeCart({ id: 5 })])),
    http.post('*/api/orders', () =>
      HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: [{ path: 'cartId', message: 'All products in the cart must be available' }],
          },
        },
        { status: 400 },
      ),
    ),
  )
  const { wrapper, router } = await mountApp({ path: '/cart', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('สั่งอาหารร้านนี้'))
  await findButton(wrapper, 'สั่งอาหารร้านนี้').trigger('click')
  await vi.waitFor(() =>
    expect(toastError).toHaveBeenCalledWith('มีเมนูที่หมดแล้วอยู่ในตะกร้า กรุณาลบออกก่อนสั่ง'),
  )
  expect(router.currentRoute.value.name).toBe('cart')
})
