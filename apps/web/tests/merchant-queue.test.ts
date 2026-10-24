import type { ShopOrder } from '@canteen/shared'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { toast } from 'vue-sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { QUEUE_REFETCH_MS } from '@/features/orders'
import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'
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
  expect(wrapper.text()).toContain('สมชาย · 081-234-5678')
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
  let gets = 0
  let releaseRefetch: () => void = () => {}
  const refetchGate = new Promise<void>((resolve) => {
    releaseRefetch = resolve
  })
  server.use(
    http.get('*/api/shops/mine/orders', async () => {
      gets += 1
      // hold the post-failure refetch so only onError's snapshot restore can uncheck the box
      if (gets > 1) await refetchGate
      return HttpResponse.json({ waiting: [order()], finished: [] })
    }),
    http.patch('*/api/order-items/:id', () =>
      HttpResponse.json({ message: 'boom' }, { status: 500 }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  await checkbox(wrapper, 'ข้าวมันไก่').trigger('click')
  await vi.waitFor(() => expect(toastError).toHaveBeenCalled())
  await vi.waitFor(() => expect(gets).toBe(2))
  expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('false')
  releaseRefetch()
  wrapper.unmount()
})

test('polling keeps running after a toggle settles', async () => {
  const gets = vi.fn()
  server.use(
    http.get('*/api/shops/mine/orders', () => {
      gets()
      return HttpResponse.json({ waiting: [order()], finished: [] })
    }),
    http.patch('*/api/order-items/:id', () => HttpResponse.json(item(7, 'ข้าวมันไก่', true))),
  )
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  await checkbox(wrapper, 'ข้าวมันไก่').trigger('click')
  // the settle refetch
  await vi.waitFor(() => expect(gets).toHaveBeenCalledTimes(2))
  await vi.advanceTimersByTimeAsync(QUEUE_REFETCH_MS + 500)
  await vi.waitFor(() => expect(gets).toHaveBeenCalledTimes(3))
  await vi.advanceTimersByTimeAsync(QUEUE_REFETCH_MS)
  await vi.waitFor(() => expect(gets).toHaveBeenCalledTimes(4))
  wrapper.unmount()
})

test('a refetch landing mid-PATCH with stale data does not uncheck the box', async () => {
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({ waiting: [order()], finished: [] }),
    ),
    http.patch('*/api/order-items/:id', async () => {
      await gate
      return HttpResponse.json(item(7, 'ข้าวมันไก่', true))
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  await checkbox(wrapper, 'ข้าวมันไก่').trigger('click')
  await vi.waitFor(() =>
    expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('true'),
  )
  await queryClient.refetchQueries({ queryKey: queryKeys.orders.shop })
  await flushPromises()
  expect(checkbox(wrapper, 'ข้าวมันไก่').attributes('aria-checked')).toBe('true')
  release()
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

test('logout in the merchant layout clears the session and goes to the customer home', async () => {
  server.use(
    http.get('*/api/shops/mine/orders', () => HttpResponse.json({ waiting: [], finished: [] })),
    http.post('*/api/auth/logout', () => HttpResponse.json(null)),
  )
  const { wrapper, router } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีออเดอร์'))
  await wrapper.get('[data-testid="merchant-sidebar"]').find('button').trigger('click')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('home'))
  expect(localStorage.getItem('token')).toBeNull()
})

test('completing an order shows คิว #42 เสร็จแล้ว with ย้อนกลับ that sends status waiting', async () => {
  const body = vi.fn()
  const success = vi.spyOn(toast, 'success').mockImplementation(() => '')
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({ waiting: [order()], finished: [] }),
    ),
    http.patch('*/api/orders/:id/status', async ({ params, request }) => {
      body(params.id, await request.json())
      return HttpResponse.json(order())
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  await findButton(wrapper, 'เสร็จทั้งออเดอร์').trigger('click')
  await vi.waitFor(() => expect(success).toHaveBeenCalled())
  const [message, options] = success.mock.calls[0]!
  expect(message).toBe('คิว #42 เสร็จแล้ว')
  const action = (options as { action: { label: string; onClick: () => void } }).action
  expect(action.label).toBe('ย้อนกลับ')
  action.onClick()
  await vi.waitFor(() => expect(body).toHaveBeenLastCalledWith('42', { status: 'waiting' }))
  wrapper.unmount()
})

test('undo failure shows an error toast and leaves buttons usable (Review Focus 3)', async () => {
  const success = vi.spyOn(toast, 'success').mockImplementation(() => '')
  const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '')
  const calls: string[] = []
  let finished = false
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
    http.patch('*/api/orders/:id/status', async ({ request }) => {
      const { status } = (await request.json()) as { status: string }
      calls.push(status)
      if (status === 'waiting') return HttpResponse.json({ message: 'boom' }, { status: 500 })
      finished = true
      return HttpResponse.json(order())
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  await findButton(wrapper, 'เสร็จทั้งออเดอร์').trigger('click')
  await vi.waitFor(() => expect(success).toHaveBeenCalled())
  await vi.waitFor(() =>
    expect(wrapper.find('aside[aria-label="เสร็จแล้ว"]').text()).toContain('#42'),
  )
  const options = success.mock.calls[0]![1] as { action: { onClick: () => void } }
  options.action.onClick()
  await vi.waitFor(() => expect(toastError).toHaveBeenCalled())
  await flushPromises()
  expect(calls).toEqual(['finished', 'waiting'])
  const reopen = wrapper.get('aside[aria-label="เสร็จแล้ว"]').find('button')
  expect(reopen.text()).toBe('ย้อนกลับ')
  expect(reopen.attributes('disabled')).toBeUndefined()
  wrapper.unmount()
})

test('overlapping completions each keep their own undo toast', async () => {
  const success = vi.spyOn(toast, 'success').mockImplementation(() => '')
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({
        waiting: [order({ id: 42 }), order({ id: 43 })],
        finished: [],
      }),
    ),
    http.patch('*/api/orders/:id/status', async () => {
      await gate
      return HttpResponse.json(order())
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#43'))
  const buttons = wrapper.findAll('button').filter((b) => b.text().includes('เสร็จทั้งออเดอร์'))
  expect(buttons).toHaveLength(2)
  await buttons[0]!.trigger('click')
  await buttons[1]!.trigger('click')
  release()
  await vi.waitFor(() => expect(success).toHaveBeenCalledTimes(2))
  expect(success.mock.calls.map((c) => c[0]).sort()).toEqual([
    'คิว #42 เสร็จแล้ว',
    'คิว #43 เสร็จแล้ว',
  ])
  wrapper.unmount()
})

test('finished column empty shows ยังไม่มีออเดอร์ที่เสร็จ', async () => {
  server.use(
    http.get('*/api/shops/mine/orders', () =>
      HttpResponse.json({ waiting: [order()], finished: [] }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('#42'))
  expect(wrapper.find('aside[aria-label="เสร็จแล้ว"]').text()).toContain('ยังไม่มีออเดอร์ที่เสร็จ')
  wrapper.unmount()
})

test('the customer link lives in the sidebar and the tab strip, not a separate row', async () => {
  server.use(
    http.get('*/api/shops/mine/orders', () => HttpResponse.json({ waiting: [], finished: [] })),
  )
  const { wrapper } = await mountApp({ path: '/merchant/queue', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีออเดอร์'))
  const links = wrapper.findAll('a').filter((a) => a.text().includes('ไปหน้าลูกค้า'))
  expect(links).toHaveLength(2)
  expect(wrapper.get('[data-testid="merchant-sidebar"]').text()).toContain('ไปหน้าลูกค้า')
  expect(wrapper.get('[data-testid="merchant-tabs"]').text()).toContain('ไปหน้าลูกค้า')
  wrapper.unmount()
})
