import { http, HttpResponse } from 'msw'
import { expect, test, vi } from 'vitest'
import { makeCart, makeProduct, makeShop, makeShopDetail, makeUser } from './fixtures'
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
  expect(wrapper.text()).toContain('ลองค้นด้วยชื่อร้านอื่น')
  expect(wrapper.text()).toContain('ล้างคำค้นหา')
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
  expect(wrapper.text()).toContain('ลองดูร้านอื่นก่อนนะ')
  const link = wrapper.findAll('a').find((a) => a.text() === 'ดูร้านทั้งหมด')
  expect(link).toBeDefined()
  expect(link!.attributes('href')).toBe('/')
})

test('/shops/9999 (API 404) shows Not Found', async () => {
  server.use(
    http.get('*/api/shops/9999', () =>
      HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'x' } }, { status: 404 }),
    ),
  )
  const { wrapper } = await mountApp({ path: '/shops/9999' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบร้านนี้'))
  expect(wrapper.text()).toContain('ดูร้านทั้งหมด')
  expect(wrapper.text()).not.toContain('ไม่พบหน้าที่ค้นหา')
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
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบร้านนี้'))
  expect(wrapper.text()).toContain('ดูร้านทั้งหมด')
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
  const put = vi.fn()
  server.use(
    http.put('*/api/cart/shops/3/items', () => {
      put()
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const { wrapper } = await mountApp({ path: '/shops/3', user: makeUser() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('แกงเขียวหวาน'))
  expect(wrapper.text()).not.toContain('ดูตะกร้า')
  const add = '[aria-label="เพิ่มจำนวน แกงเขียวหวาน"]'
  await vi.waitFor(() => expect(wrapper.get(add).attributes('disabled')).toBeUndefined())
  await wrapper.get(add).trigger('click')
  await wrapper.get(add).trigger('click')
  await wrapper.get('[aria-label="เพิ่มจำนวน แกงส้ม"]').trigger('click')
  const bar = wrapper.get('[data-testid="cart-bar"]')
  expect(bar.text()).toContain('ดูตะกร้า')
  expect(bar.text()).toContain('3')
  expect(bar.text()).toContain('฿165')
  expect(bar.attributes('href')).toBe('/cart')
  expect(bar.classes()).toEqual(
    expect.arrayContaining(['md:inset-x-auto', 'md:right-8', 'md:w-96', 'active:bg-primary/80']),
  )
  expect(bar.get('[data-testid="cart-count"]').classes()).toContain('text-caption')
  await vi.waitFor(() => expect(put).toHaveBeenCalledTimes(1))
})

test('navigating between shops sends the unsent edit to the old shop only', async () => {
  const puts: { url: string; body: unknown }[] = []
  server.use(
    http.get('*/api/shops/1', () =>
      HttpResponse.json(
        makeShopDetail({
          id: 1,
          products: [makeProduct({ id: 10, shopId: 1, name: 'เมนูหนึ่ง', price: 50 })],
        }),
      ),
    ),
    http.get('*/api/shops/2', () =>
      HttpResponse.json(
        makeShopDetail({
          id: 2,
          products: [makeProduct({ id: 20, shopId: 2, name: 'เมนูสอง', price: 30 })],
        }),
      ),
    ),
    http.get('*/api/cart', () =>
      HttpResponse.json([
        makeCart({
          id: 2,
          shop: { id: 2, name: 'ร้านสอง', imageUrl: null },
          items: [
            {
              id: 5,
              productId: 20,
              name: 'เมนูสอง',
              imageUrl: null,
              price: 30,
              quantity: 4,
              subtotal: 120,
            },
          ],
          totalPrice: 120,
        }),
      ]),
    ),
    http.put('*/api/cart/shops/:shopId/items', async ({ request }) => {
      puts.push({ url: new URL(request.url).pathname, body: await request.json() })
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const { wrapper, router } = await mountApp({ path: '/shops/1', user: makeUser() })
  const add = '[aria-label="เพิ่มจำนวน เมนูหนึ่ง"]'
  await vi.waitFor(() => expect(wrapper.find(add).exists()).toBe(true))
  await vi.waitFor(() => expect(wrapper.get(add).attributes('disabled')).toBeUndefined())
  await wrapper.get(add).trigger('click')
  await router.push('/shops/2')
  await vi.waitFor(() => expect(wrapper.text()).toContain('เมนูสอง'))
  await vi.waitFor(() => expect(wrapper.find('[aria-label="ลดจำนวน เมนูสอง"]').exists()).toBe(true))
  await vi.waitFor(() => expect(puts).toHaveLength(1))
  await new Promise((resolve) => setTimeout(resolve, 400))
  expect(puts).toEqual([
    { url: '/api/cart/shops/1/items', body: { items: [{ productId: 10, quantity: 1 }] } },
  ])
  expect(wrapper.get('[data-testid="cart-bar"]').text()).toContain('฿120')
})

test('navigating to a shop within the search debounce never stamps ?q= onto the shop page', async () => {
  trackSearch()
  server.use(http.get('*/api/shops/:id', () => HttpResponse.json(makeShopDetail({ id: 1 }))))
  const { wrapper, router } = await mountApp({ path: '/' })
  await vi.waitFor(() => expect(wrapper.find('a[href="/shops/1"]').exists()).toBe(true))
  await wrapper.get('input[type="search"]').setValue('ก๋วย')
  await router.push('/shops/1')
  await new Promise((resolve) => setTimeout(resolve, 450))
  expect(router.currentRoute.value.fullPath).toBe('/shops/1')
  await vi.waitFor(() => expect(wrapper.text()).toContain('ข้าวมันไก่'))
})

function searchInput(wrapper: { get: (s: string) => { element: Element } }): HTMLInputElement {
  return wrapper.get('input[type="search"]').element as HTMLInputElement
}

test('back/forward restores the search box without re-writing the URL', async () => {
  trackSearch()
  const { wrapper, router } = await mountApp({ path: '/' })
  const input = wrapper.get('input[type="search"]')
  await input.setValue('ก๋วย')
  await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('ก๋วย'))
  await router.push({ path: '/', query: { q: 'ข้าว' } })
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('ข้าว'))
  const replace = vi.spyOn(router, 'replace')
  router.back()
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('ก๋วย'))
  await new Promise((resolve) => setTimeout(resolve, 450))
  expect(replace).not.toHaveBeenCalled()
  expect(router.currentRoute.value.query.q).toBe('ก๋วย')
})

test('back/forward cancels a pending debounce so it cannot overwrite the restored box', async () => {
  trackSearch()
  const { wrapper, router } = await mountApp({ path: '/?q=ก๋วย' })
  await router.push({ path: '/', query: { q: 'ข้าว' } })
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('ข้าว'))
  await wrapper.get('input[type="search"]').setValue('ข้าวมัน')
  router.back()
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('ก๋วย'))
  await new Promise((resolve) => setTimeout(resolve, 450))
  expect(router.currentRoute.value.query.q).toBe('ก๋วย')
  expect(searchInput(wrapper).value).toBe('ก๋วย')
})

test('typing is not overwritten by an older ?q= while debounce is pending', async () => {
  trackSearch()
  const { wrapper, router } = await mountApp({ path: '/' })
  let held = 0
  router.beforeEach(async (to) => {
    if (to.query.q === 'ก๋') {
      held += 1
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  })
  const input = wrapper.get('input[type="search"]')
  await input.setValue('ก๋')
  await vi.waitFor(() => expect(held).toBe(1))
  await input.setValue('ก๋ว')
  await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('ก๋'))
  expect(searchInput(wrapper).value).toBe('ก๋ว')
  await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBe('ก๋ว'))
  expect(searchInput(wrapper).value).toBe('ก๋ว')
})

test('a whitespace-only entry does not stop a later navigation from syncing the box', async () => {
  trackSearch()
  const { wrapper, router } = await mountApp({ path: '/' })
  await wrapper.get('input[type="search"]').setValue(' ')
  await new Promise((resolve) => setTimeout(resolve, 450))
  await router.push({ path: '/', query: { q: 'x' } })
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('x'))
  router.back()
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe(''))
})

test('typing and reverting within the debounce does not stop a later back from syncing', async () => {
  trackSearch()
  const { wrapper, router } = await mountApp({ path: '/?q=ก๋วย' })
  const input = wrapper.get('input[type="search"]')
  await input.setValue('ก๋วยx')
  await input.setValue('ก๋วย')
  await new Promise((resolve) => setTimeout(resolve, 450))
  await router.push({ path: '/', query: { q: 'ข้าว' } })
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('ข้าว'))
  router.back()
  await vi.waitFor(() => expect(searchInput(wrapper).value).toBe('ก๋วย'))
})

test('clearing a no-result search never flashes the empty-canteen state', async () => {
  server.use(
    http.get('*/api/shops', async ({ request }) => {
      const search = new URL(request.url).searchParams.get('search')
      if (search) return HttpResponse.json([])
      await new Promise((resolve) => setTimeout(resolve, 200))
      return HttpResponse.json([makeShop({ id: 1, name: 'ร้านก๋วยเตี๋ยว' })])
    }),
  )
  const { wrapper } = await mountApp({ path: '/?q=zzz' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบร้านที่ค้นหา'))
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'ล้างคำค้นหา')!
    .trigger('click')
  const flashed: boolean[] = []
  await vi.waitFor(
    () => {
      flashed.push(wrapper.text().includes('ยังไม่มีร้านในโรงอาหาร'))
      expect(wrapper.text()).toContain('ร้านก๋วยเตี๋ยว')
    },
    { interval: 10 },
  )
  expect(flashed.some(Boolean)).toBe(false)
})

test('clear-search button clears ?q= and shows all shops', async () => {
  const seen: (string | null)[] = []
  server.use(
    http.get('*/api/shops', ({ request }) => {
      const search = new URL(request.url).searchParams.get('search')
      seen.push(search)
      return HttpResponse.json(search ? [] : [makeShop({ id: 1, name: 'ร้านก๋วยเตี๋ยว' })])
    }),
  )
  const { wrapper, router } = await mountApp({ path: '/?q=zzz' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบร้านที่ค้นหา'))
  const clear = wrapper.findAll('button').find((b) => b.text() === 'ล้างคำค้นหา')
  expect(clear).toBeDefined()
  await clear!.trigger('click')
  await vi.waitFor(() => expect(router.currentRoute.value.query.q).toBeUndefined())
  expect(searchInput(wrapper).value).toBe('')
  await vi.waitFor(() => expect(wrapper.text()).toContain('ร้านก๋วยเตี๋ยว'))
})

test('banner is hidden while searching and shown again after clearing', async () => {
  trackSearch()
  const { wrapper } = await mountApp({ path: '/' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('สั่งก่อน รับก่อน'))
  expect(wrapper.text()).toContain('#12')
  await wrapper.get('input[type="search"]').setValue('ก๋วย')
  await vi.waitFor(() => expect(wrapper.text()).not.toContain('สั่งก่อน รับก่อน'))
})

test('search box wrapper shows a visible focus indicator', async () => {
  trackSearch()
  const { wrapper } = await mountApp({ path: '/' })
  expect(wrapper.get('input[type="search"]').element.parentElement?.className).toContain(
    'focus-within:outline-ring',
  )
})

test('shop hero is capped on desktop and the cart bar is a floating box', async () => {
  server.use(
    http.get('*/api/shops/3', () =>
      HttpResponse.json(
        makeShopDetail({ id: 3, products: [makeProduct({ id: 1, name: 'แกงเขียวหวาน' })] }),
      ),
    ),
  )
  const { wrapper } = await mountApp({ path: '/shops/3' })
  await vi.waitFor(() => expect(wrapper.text()).toContain('แกงเขียวหวาน'))
  const hero = wrapper.get('[data-testid="shop-hero"]')
  expect(hero.classes()).toEqual(
    expect.arrayContaining(['md:h-72', 'md:overflow-hidden', 'md:rounded-b-3xl']),
  )
})
