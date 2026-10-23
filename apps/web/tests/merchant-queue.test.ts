import type { ShopOrder } from '@canteen/shared'
import type { VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { toast } from 'vue-sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { QUEUE_REFETCH_MS } from '@/features/orders'
import { makeShop, makeShopOrder, makeUser } from './fixtures'
import { mountApp } from './mount-app'
import { server } from './msw/server'

beforeEach(() => {
  server.use(http.get('*/api/shops/:id', () => HttpResponse.json(makeShop())))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const merchant = () => makeUser({ id: 2, role: 'merchant', shopId: 1 })

function item(id: number, name: string, isDone: boolean) {
  return { id, productId: id, name, imageUrl: null, unitPrice: 50, quantity: 1, isDone }
}

function order(overrides: Partial<ShopOrder> = {}): ShopOrder {
  return makeShopOrder({
    id: 42,
    items: [item(7, 'ข้าวมันไก่', false), item(8, 'น้ำเปล่า', false)],
    ...overrides,
  })
}

function checkbox(wrapper: VueWrapper, name: string) {
  const box = wrapper.findAll('[role="checkbox"]').find((el) => {
    const label = wrapper.find(`label[for="${el.attributes('id')}"]`)
    return label.exists() && label.text().includes(name)
  })
  expect(box, `checkbox "${name}"`).toBeDefined()
  return box!
}

function findButton(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll('button').find((b) => b.text().includes(label))
  expect(button, `button "${label}"`).toBeDefined()
  return button!
}

test('ticking an item updates immediately and calls PATCH /order-items/:id', async () => {
  const patched = vi.fn()
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({ waiting: [order()], finished: [] }),
    ),
    http.patch('*/api/order-items/:id', async ({ params, request }) => {
      patched(params.id, await request.json())
      await gate
      return HttpResponse.json(item(7, 'ข้าวมันไก่', true))
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  expect(wrapper.text()).toContain('รอทำ 1')
  expect(wrapper.text()).toContain('เสร็จแล้ว 0')
  expect(wrapper.text()).toContain('สมชาย · 0812345678')
  await checkbox(wrapper, 'ข้าวมันไก่').trigger('click')
  // checked while the request is still pending
  await vi.waitFor(() =>
    expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('true'),
  )
  await vi.waitFor(() => expect(patched).toHaveBeenCalledWith('7', { isDone: true }))
  release()
  wrapper.unmount()
})

test('a poll landing mid-toggle does not revert the tick (Review Focus 3)', async () => {
  let serverDone = false
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const gets = vi.fn()
  server.use(
    http.get('*/api/shops/mine/orders', () => {
      gets()
      // the stale poll answer: the server has not applied the tick yet
      return HttpResponse.json({
        waiting: [
          order({ items: [item(7, 'ข้าวมันไก่', serverDone), item(8, 'น้ำเปล่า', false)] }),
        ],
        finished: [],
      })
    }),
    http.patch('*/api/order-items/:id', async () => {
      await gate
      serverDone = true
      return HttpResponse.json(item(7, 'ข้าวมันไก่', true))
    }),
  )
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  const before = gets.mock.calls.length
  await checkbox(wrapper, 'ข้าวมันไก่').trigger('click')
  await vi.waitFor(() =>
    expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('true'),
  )
  // a poll tick lands while the PATCH is still pending
  await vi.advanceTimersByTimeAsync(QUEUE_REFETCH_MS + 500)
  expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('true')
  release()
  await vi.waitFor(() => expect(gets.mock.calls.length).toBeGreaterThan(before))
  await vi.waitFor(() => expect(serverDone).toBe(true))
  await vi.advanceTimersByTimeAsync(100)
  expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('true')
  wrapper.unmount()
})

test('a failed toggle rolls back and shows a toast', async () => {
  const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({ waiting: [order()], finished: [] }),
    ),
    http.patch('*/api/order-items/:id', () =>
      HttpResponse.json({ message: 'boom' }, { status: 500 }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  await checkbox(wrapper, 'ข้าวมันไก่').trigger('click')
  await vi.waitFor(() => expect(toastError).toHaveBeenCalled())
  await vi.waitFor(() =>
    expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('false'),
  )
  wrapper.unmount()
})

test('complete moves the order to the finished column', async () => {
  let finished = false
  const body = vi.fn()
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json(
        finished
          ? {
              waiting: [],
              finished: [order({ status: 'finished', finishedAt: '2026-01-01T03:30:00.000Z' })],
            }
          : { waiting: [order()], finished: [] },
      ),
    ),
    http.patch('*/api/orders/:id/status', async ({ params, request }) => {
      body(params.id, await request.json())
      finished = true
      return HttpResponse.json(order({ status: 'finished' }))
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('รอทำ 1'))
  await findButton(wrapper, 'เสร็จทั้งออเดอร์').trigger('click')
  await vi.waitFor(() => expect(body).toHaveBeenCalledWith('42', { status: 'finished' }))
  await vi.waitFor(() => expect(wrapper.text()).toContain('รอทำ 0'))
  expect(wrapper.text()).toContain('เสร็จแล้ว 1')
  expect(wrapper.find('aside[aria-label="เสร็จแล้ว"]').text()).toContain('#42')
  expect(wrapper.text()).not.toContain('เสร็จทั้งออเดอร์')
  wrapper.unmount()
})

test('reopen sends status waiting', async () => {
  const body = vi.fn()
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({
        waiting: [],
        finished: [order({ status: 'finished', finishedAt: '2026-01-01T03:30:00.000Z' })],
      }),
    ),
    http.patch('*/api/orders/:id/status', async ({ params, request }) => {
      body(params.id, await request.json())
      return HttpResponse.json(order())
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ย้อนกลับ'))
  await findButton(wrapper, 'ย้อนกลับ').trigger('click')
  await vi.waitFor(() => expect(body).toHaveBeenCalledWith('42', { status: 'waiting' }))
  wrapper.unmount()
})

test('no orders shows the empty state', async () => {
  server.use(
    http.get('*/api/shops/mine/orders', () => HttpResponse.json({ waiting: [], finished: [] })),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีออเดอร์'))
  wrapper.unmount()
})
