import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { makeProduct, makeShop, makeShopDetail, makeUser } from './fixtures'
import { mountApp } from './mount-app'
import { server } from './msw/server'

function trackSearch(): { seen: (string | null)[]; last: () => string | null } {
  const seen: (string | null)[] = []
  server.use(
    http.get('*/api/shops', ({ request }) => {
      seen.push(new URL(request.url).searchParams.get('search'))
      return HttpResponse.json([makeShop({ id: 1, name: 'ร้านก๋วยเตี๋ยว' })])
    }),
  )
  return { seen, last: () => seen[seen.length - 1] ?? null }
}

test('home lists shops and links to each shop', async () => {
  const { wrapper } = await mountApp({ path: '/' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ร้านก๋วยเตี๋ยว'))
  expect(wrapper.text()).toContain('สั่งก่อน รับก่อน')
  expect(wrapper.text()).toContain('ร้านในโรงอาหาร')
  expect(wrapper.text()).toContain('2 ร้าน')
  expect(wrapper.find('a[href="/shops/1"]').exists()).toBe(true)
  expect(wrapper.find('a[href="/shops/2"]').exists()).toBe(true)
})

test('typing in search is debounced by 300ms, coalesced, then updates ?q= and requests ?search=', async () => {
  const search = trackSearch()
  const { wrapper, router } = await mountApp({ path: '/' })
  await vi.waitFor(() => expect(search.seen).toHaveLength(1))
  const input = wrapper.get('input[type="search"]')
  await input.setValue('ก')
  await input.setValue('ก๋')
  await input.setValue('ก๋วย')
  await new Promise((resolve) => setTimeout(resolve, 150))
  expect(router.currentRoute.value.query.q).toBeUndefined()
  expect(search.seen).toEqual([null])
  await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('ก๋วย'))
  await vi.waitFor(() => expect(search.last()).toBe('ก๋วย'))
  expect(search.seen).toEqual([null, 'ก๋วย'])
})

test('initial search value comes from ?q=', async () => {
  const search = trackSearch()
  const { wrapper } = await mountApp({ path: '/?q=ก๋วย' })
  expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('ก๋วย')
  await vi.waitFor(() => expect(search.last()).toBe('ก๋วย'))
})

test('no results shows the empty state', async () => {
  server.use(http.get('*/api/shops', () => HttpResponse.json([])))
  const { wrapper } = await mountApp({ path: '/?q=zzz' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบร้านที่ค้นหา'))
})

test('no shops at all shows the empty canteen state', async () => {
  server.use(http.get('*/api/shops', () => HttpResponse.json([])))
  const { wrapper } = await mountApp({ path: '/' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีร้านในโรงอาหาร'))
})

test('shop page shows menu and marks not-available items', async () => {
  server.use(
    http.get('*/api/shops/3', () =>
      HttpResponse.json(
        makeShopDetail({
          id: 3,
          name: 'ร้านข้าวแกง',
          products: [
            makeProduct({ id: 1, name: 'แกงเขียวหวาน', price: 60 }),
            makeProduct({ id: 2, name: 'แกงส้ม', status: 'not-available' }),
          ],
        }),
      ),
    ),
  )
  const { wrapper } = await mountApp({ path: '/shops/3' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('แกงเขียวหวาน'))
  expect(wrapper.text()).toContain('ร้านข้าวแกง')
  expect(wrapper.text()).toContain('เมนู')
  expect(wrapper.text()).toContain('฿60')
  expect(wrapper.text()).toContain('แกงส้ม')
  expect(wrapper.text().match(/หมดชั่วคราว/g)).toHaveLength(1)
})

test('shop with no products shows "ร้านนี้ยังไม่มีเมนู"', async () => {
  server.use(
    http.get('*/api/shops/4', () => HttpResponse.json(makeShopDetail({ id: 4, products: [] }))),
  )
  const { wrapper } = await mountApp({ path: '/shops/4' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ร้านนี้ยังไม่มีเมนู'))
})

test('/shops/9999 (API 404) shows Not Found', async () => {
  server.use(
    http.get('*/api/shops/9999', () =>
      HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/shops/9999' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบหน้าที่ค้นหา'))
})

test('/shops/abc shows Not Found without calling the API', async () => {
  const calls = vi.fn()
  server.use(
    http.get('*/api/shops/:id', () => {
      calls()
      return HttpResponse.json({})
    }),
  )
  const { wrapper } = await mountApp({ path: '/shops/abc' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบหน้าที่ค้นหา'))
  expect(calls).not.toHaveBeenCalled()
})

test('shop request failure shows an error with retry', async () => {
  server.use(http.get('*/api/shops/5', () => HttpResponse.json({}, { status: 500 })))
  const { wrapper } = await mountApp({ path: '/shops/5' })
  await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true), {
    timeout: 3000,
  })
})

test('merchant layout shows the shop name', async () => {
  server.use(
    http.get('*/api/shops/7', () =>
      HttpResponse.json(makeShopDetail({ id: 7, name: 'ร้านของฉัน' })),
    ),
  )
  const { wrapper } = await mountApp({
    path: '/merchant/queue',
    user: makeUser({ role: 'merchant', shopId: 7 }),
  })
  await vi.waitFor(() =>
    expect(wrapper.get('[data-testid="merchant-sidebar"]').text()).toContain('ร้านของฉัน'),
  )
})

function mockShop3() {
  server.use(
    http.get('*/api/shops/3', () =>
      HttpResponse.json(
        makeShopDetail({
          id: 3,
          name: 'ร้านข้าวแกง',
          products: [
            makeProduct({ id: 1, shopId: 3, name: 'แกงเขียวหวาน', price: 60 }),
            makeProduct({ id: 2, shopId: 3, name: 'แกงส้ม', price: 45 }),
          ],
        }),
      ),
    ),
  )
}

test('guest tapping + is sent to login with redirect back to the shop', async () => {
  mockShop3()
  const { wrapper, router } = await mountApp({ path: '/shops/3' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('แกงเขียวหวาน'))
  await wrapper.get('[aria-label="เพิ่มจำนวน แกงเขียวหวาน"]').trigger('click')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('login'))
  expect(router.currentRoute.value.query.redirect).toBe('/shops/3')
})

test('floating bar shows count and total after adding', async () => {
  mockShop3()
  server.use(http.put('*/api/cart/shops/3/items', () => new HttpResponse(null, { status: 204 })))
  const { wrapper } = await mountApp({ path: '/shops/3', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('แกงเขียวหวาน'))
  expect(wrapper.text()).not.toContain('ดูตะกร้า')
  const add = '[aria-label="เพิ่มจำนวน แกงเขียวหวาน"]'
  await wrapper.get(add).trigger('click')
  await wrapper.get(add).trigger('click')
  await wrapper.get('[aria-label="เพิ่มจำนวน แกงส้ม"]').trigger('click')
  const bar = wrapper.get('[data-testid="cart-bar"]')
  expect(bar.text()).toContain('ดูตะกร้า')
  expect(bar.text()).toContain('3')
  expect(bar.text()).toContain('฿165')
  expect(bar.attributes('href')).toBe('/cart')
})
