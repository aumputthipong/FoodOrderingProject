import type { ShopDetail } from '@canteen/shared'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { File as NodeFile } from 'node:buffer'
import { toast } from 'vue-sonner'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { makeProduct, makeShop, makeShopDetail, makeUser } from './fixtures'
import { mountApp } from './mount-app'
import { server } from './msw/server'

beforeEach(() => {
  // jsdom has no object URLs; ImageUploadField previews picked files with them
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:preview', configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const merchant = () => makeUser({ id: 2, role: 'merchant', shopId: 1 })
// jsdom's own File cannot be streamed by Node's fetch (the request aborts), so use Node's
const png = () => new NodeFile(['x'], 'photo.png', { type: 'image/png' }) as unknown as File

function serveShop(detail: ShopDetail = makeShopDetail()) {
  server.use(http.get('*/api/shops/:id', () => HttpResponse.json(detail)))
}

async function pickImage(wrapper: VueWrapper, file: File) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}

function inputByLabel(wrapper: VueWrapper, label: string) {
  const el = wrapper.findAll('label').find((l) => l.text().includes(label))
  expect(el, `label "${label}"`).toBeDefined()
  return wrapper.find(`#${CSS.escape(el!.attributes('for') ?? '')}`)
}

test('merchant without a shop is sent to create shop, and lands on the queue after creating', async () => {
  const posted = vi.fn()
  server.use(
    http.get('*/api/shops/:id', () => HttpResponse.json(makeShopDetail({ id: 7 }))),
    http.get('*/api/shops/mine/orders', () => HttpResponse.json({ waiting: [], finished: [] })),
    http.post('*/api/shops', async ({ request }) => {
      const form = await request.formData()
      posted(form.get('name'), form.get('description'), form.has('image'))
      server.use(
        http.get('*/api/auth/me', () =>
          HttpResponse.json(makeUser({ id: 2, role: 'merchant', shopId: 7 })),
        ),
      )
      return HttpResponse.json(makeShop({ id: 7 }), { status: 201 })
    }),
  )
  const success = vi.spyOn(toast, 'success')
  const { wrapper, router } = await mountApp({
    path: '/merchant/queue',
    user: makeUser({ id: 2, role: 'merchant', shopId: null }),
  })
  expect(router.currentRoute.value.name).toBe('merchant-shop-new')
  expect(wrapper.text()).toContain('สร้างร้านของคุณ')
  await inputByLabel(wrapper, 'ชื่อร้าน').setValue('ร้านใหม่')
  await inputByLabel(wrapper, 'คำอธิบาย').setValue('อร่อยมาก')
  await pickImage(wrapper, png())
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('merchant-queue'))
  expect(posted).toHaveBeenCalledWith('ร้านใหม่', 'อร่อยมาก', true)
  expect(success).toHaveBeenCalledWith('สร้างร้านแล้ว')
  wrapper.unmount()
})

test('create shop without an image shows กรุณาเลือกรูป and sends nothing', async () => {
  const posted = vi.fn()
  server.use(
    http.post('*/api/shops', () => {
      posted()
      return HttpResponse.json(makeShop(), { status: 201 })
    }),
  )
  const { wrapper } = await mountApp({
    path: '/merchant/shop/new',
    user: makeUser({ id: 2, role: 'merchant', shopId: null }),
  })
  await inputByLabel(wrapper, 'ชื่อร้าน').setValue('ร้านใหม่')
  await inputByLabel(wrapper, 'คำอธิบาย').setValue('อร่อยมาก')
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => expect(wrapper.text()).toContain('กรุณาเลือกรูป'))
  await flushPromises()
  expect(posted).not.toHaveBeenCalled()
  wrapper.unmount()
})

test('server 400 on image is shown under the image field', async () => {
  server.use(
    http.post('*/api/shops', () =>
      HttpResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid',
            details: [{ path: 'image', message: 'Image is required' }],
          },
        },
        { status: 400 },
      ),
    ),
  )
  const { wrapper } = await mountApp({
    path: '/merchant/shop/new',
    user: makeUser({ id: 2, role: 'merchant', shopId: null }),
  })
  await inputByLabel(wrapper, 'ชื่อร้าน').setValue('ร้านใหม่')
  await inputByLabel(wrapper, 'คำอธิบาย').setValue('อร่อยมาก')
  await pickImage(wrapper, png())
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => {
    const alert = wrapper.findAll('[role="alert"]').find((a) => a.text() === 'กรุณาเลือกรูป')
    expect(alert).toBeDefined()
  })
  wrapper.unmount()
})

test('edit shop pre-fills fields and sends PUT without image when unchanged', async () => {
  serveShop(makeShopDetail({ name: 'ร้านเดิม', description: 'คำอธิบายเดิม' }))
  const put = vi.fn()
  server.use(
    http.put('*/api/shops/:id', async ({ params, request }) => {
      const form = await request.formData()
      put(params.id, form.get('name'), form.get('description'), form.has('image'))
      return HttpResponse.json(makeShop())
    }),
  )
  const success = vi.spyOn(toast, 'success')
  const { wrapper } = await mountApp({ path: '/merchant/shop', user: merchant() })
  await vi.waitFor(() =>
    expect((inputByLabel(wrapper, 'ชื่อร้าน').element as HTMLInputElement).value).toBe('ร้านเดิม'),
  )
  expect((inputByLabel(wrapper, 'คำอธิบาย').element as HTMLTextAreaElement).value).toBe(
    'คำอธิบายเดิม',
  )
  await inputByLabel(wrapper, 'ชื่อร้าน').setValue('ร้านแก้ไข')
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => expect(put).toHaveBeenCalledWith('1', 'ร้านแก้ไข', 'คำอธิบายเดิม', false))
  await vi.waitFor(() => expect(success).toHaveBeenCalledWith('บันทึกแล้ว'))
  wrapper.unmount()
})

test('menu switch toggles status optimistically', async () => {
  serveShop(
    makeShopDetail({
      products: [
        makeProduct({ id: 5, name: 'ข้าวมันไก่', status: 'available' }),
        makeProduct({ id: 6, name: 'น้ำเปล่า', status: 'not-available' }),
      ],
    }),
  )
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const patched = vi.fn()
  server.use(
    http.patch('*/api/products/:id/status', async ({ params, request }) => {
      patched(params.id, await request.json())
      await gate
      return HttpResponse.json(makeProduct({ id: 6, status: 'available' }))
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/menu', user: merchant() })
  await vi.waitFor(() => expect(wrapper.findAll('[role="switch"]')).toHaveLength(2))
  expect(wrapper.text()).toContain('เปิดขาย')
  const switches = () => wrapper.findAll('[role="switch"]')
  expect(switches()[0]!.attributes('aria-checked')).toBe('true')
  expect(switches()[1]!.attributes('aria-checked')).toBe('false')
  await switches()[1]!.trigger('click')
  await vi.waitFor(() => expect(switches()[1]!.attributes('aria-checked')).toBe('true'))
  await vi.waitFor(() => expect(patched).toHaveBeenCalledWith('6', { status: 'available' }))
  release()
  wrapper.unmount()
})

test('menu switch rolls back and toasts when the update fails', async () => {
  serveShop(makeShopDetail({ products: [makeProduct({ id: 5, status: 'available' })] }))
  server.use(
    http.patch('*/api/products/:id/status', () =>
      HttpResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }, { status: 500 }),
    ),
  )
  const error = vi.spyOn(toast, 'error')
  const { wrapper } = await mountApp({ path: '/merchant/menu', user: merchant() })
  await vi.waitFor(() => expect(wrapper.findAll('[role="switch"]')).toHaveLength(1))
  await wrapper.find('[role="switch"]').trigger('click')
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  await vi.waitFor(() =>
    expect(wrapper.find('[role="switch"]').attributes('aria-checked')).toBe('true'),
  )
  wrapper.unmount()
})

test('menu page shows an empty state with an add button when there are no products', async () => {
  serveShop(makeShopDetail({ products: [] }))
  const { wrapper } = await mountApp({ path: '/merchant/menu', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ยังไม่มีเมนู'))
  expect(wrapper.findAll('a').some((a) => a.text().includes('เพิ่มเมนู'))).toBe(true)
  wrapper.unmount()
})

test('new product posts to /shops/:shopId/products and returns to the menu', async () => {
  serveShop()
  const posted = vi.fn()
  server.use(
    http.post('*/api/shops/:shopId/products', async ({ params, request }) => {
      const form = await request.formData()
      posted(
        params.shopId,
        form.get('name'),
        form.get('description'),
        form.get('price'),
        form.has('image'),
      )
      return HttpResponse.json(makeProduct({ id: 9, status: 'not-available' }), { status: 201 })
    }),
  )
  const success = vi.spyOn(toast, 'success')
  const { wrapper, router } = await mountApp({ path: '/merchant/menu/new', user: merchant() })
  const price = inputByLabel(wrapper, 'ราคา')
  expect(price.attributes('step')).toBe('0.01')
  expect(price.attributes('min')).toBe('0.01')
  await inputByLabel(wrapper, 'ชื่อเมนู').setValue('ผัดไทย')
  await inputByLabel(wrapper, 'รายละเอียด').setValue('เส้นจันท์')
  await price.setValue('45.5')
  await pickImage(wrapper, png())
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('merchant-menu'))
  expect(posted).toHaveBeenCalledWith('1', 'ผัดไทย', 'เส้นจันท์', '45.5', true)
  expect(success).toHaveBeenCalledWith('เพิ่มเมนูแล้ว เปิดขายได้ที่หน้าเมนู')
  wrapper.unmount()
})

test('editing a product pre-fills it and sends PUT without image', async () => {
  serveShop(makeShopDetail({ products: [makeProduct({ id: 5, name: 'ข้าวมันไก่', price: 50 })] }))
  const put = vi.fn()
  server.use(
    http.put('*/api/products/:id', async ({ params, request }) => {
      const form = await request.formData()
      put(params.id, form.get('price'), form.has('image'))
      return HttpResponse.json(makeProduct({ id: 5 }))
    }),
  )
  const { wrapper, router } = await mountApp({ path: '/merchant/menu/5/edit', user: merchant() })
  await vi.waitFor(() =>
    expect((inputByLabel(wrapper, 'ชื่อเมนู').element as HTMLInputElement).value).toBe(
      'ข้าวมันไก่',
    ),
  )
  await inputByLabel(wrapper, 'ราคา').setValue('60')
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('merchant-menu'))
  expect(put).toHaveBeenCalledWith('5', '60', false)
  wrapper.unmount()
})

test('editing an unknown product id shows Not Found', async () => {
  serveShop()
  const { wrapper } = await mountApp({ path: '/merchant/menu/999/edit', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('ไม่พบหน้าที่ค้นหา'))
  wrapper.unmount()
})

test('creating a shop still succeeds and navigates when refreshing /me fails afterwards', async () => {
  const success = vi.spyOn(toast, 'success')
  server.use(
    http.get('*/api/shops/:id', () => HttpResponse.json(makeShopDetail({ id: 7 }))),
    http.get('*/api/shops/mine/orders', () => HttpResponse.json({ waiting: [], finished: [] })),
    http.post('*/api/shops', () => {
      server.use(http.get('*/api/auth/me', () => HttpResponse.error()))
      return HttpResponse.json(makeShop({ id: 7 }), { status: 201 })
    }),
  )
  const { wrapper, router } = await mountApp({
    path: '/merchant/shop/new',
    user: makeUser({ id: 2, role: 'merchant', shopId: null }),
  })
  await inputByLabel(wrapper, 'ชื่อร้าน').setValue('ร้านใหม่')
  await inputByLabel(wrapper, 'คำอธิบาย').setValue('อร่อยมาก')
  await pickImage(wrapper, png())
  await wrapper.find('form').trigger('submit')
  await vi.waitFor(() => expect(success).toHaveBeenCalledWith('สร้างร้านแล้ว'))
  expect(wrapper.text()).not.toContain('ข้อมูลไม่ถูกต้อง')
  expect(router.currentRoute.value.name).not.toBe('merchant-shop-new')
})

test('เมนูในร้าน link is active on the edit-menu page', async () => {
  serveShop(makeShopDetail({ products: [makeProduct({ id: 5 })] }))
  const { wrapper } = await mountApp({ path: '/merchant/menu/5/edit', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('แก้ไขเมนู'))
  const anchors = wrapper.get('[data-testid="merchant-sidebar"]').findAll('a')
  const menu = anchors.find((a) => a.text() === 'เมนูในร้าน')
  const queue = anchors.find((a) => a.text() === 'คิวออเดอร์')
  expect(menu?.attributes('aria-current')).toBe('page')
  expect(queue?.attributes('aria-current')).toBeUndefined()
  wrapper.unmount()
})

test('sold-out menu row shows หมดชั่วคราว and the switch label follows state', async () => {
  serveShop(
    makeShopDetail({
      products: [
        makeProduct({ id: 5, name: 'ข้าวมันไก่', status: 'available' }),
        makeProduct({ id: 6, name: 'น้ำเปล่า', status: 'not-available' }),
      ],
    }),
  )
  let release: () => void = () => {}
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  server.use(
    http.patch('*/api/products/:id/status', async () => {
      await gate
      return HttpResponse.json(makeProduct({ id: 6, status: 'available' }))
    }),
  )
  const { wrapper } = await mountApp({ path: '/merchant/menu', user: merchant() })
  await vi.waitFor(() => expect(wrapper.findAll('li')).toHaveLength(2))
  const [open, soldOut] = wrapper.findAll('li')
  expect(open!.text()).toContain('เปิดขาย')
  expect(open!.text()).not.toContain('หมดชั่วคราว')
  expect(soldOut!.text()).toContain('หมดชั่วคราว')
  expect(soldOut!.text()).not.toContain('เปิดขาย')
  expect(
    soldOut!.get('[data-testid="image-fallback"], img').element.closest('.grayscale'),
  ).not.toBeNull()
  expect(open!.find('.grayscale').exists()).toBe(false)
  expect(soldOut!.get('span.truncate').classes()).toContain('text-muted-foreground')
  expect(open!.get('span.truncate').classes()).not.toContain('text-muted-foreground')
  expect(soldOut!.classes()).toContain('flex-wrap')
  expect(soldOut!.get('[role="switch"]').attributes('aria-label')).toBe('เปิดขาย น้ำเปล่า')
  const switchEl = soldOut!.get('[role="switch"]')
  await switchEl.trigger('click')
  await vi.waitFor(() => expect(soldOut!.text()).toContain('เปิดขาย'))
  release()
  wrapper.unmount()
})

test('product form cancel returns to the menu', async () => {
  serveShop()
  const { wrapper, router } = await mountApp({ path: '/merchant/menu/new', user: merchant() })
  const cancel = wrapper.findAll('a').find((a) => a.text() === 'ยกเลิก')
  expect(cancel).toBeDefined()
  expect(wrapper.findAll('a').some((a) => a.text() === 'กลับ')).toBe(true)
  await cancel!.trigger('click')
  await vi.waitFor(() => expect(router.currentRoute.value.name).toBe('merchant-menu'))
  wrapper.unmount()
})

test('shop edit cancel returns to the queue', async () => {
  serveShop()
  const edit = await mountApp({ path: '/merchant/shop', user: merchant() })
  await vi.waitFor(() =>
    expect(edit.wrapper.findAll('a').some((a) => a.text() === 'ยกเลิก')).toBe(true),
  )
  await edit.wrapper
    .findAll('a')
    .find((a) => a.text() === 'ยกเลิก')!
    .trigger('click')
  await vi.waitFor(() => expect(edit.router.currentRoute.value.name).toBe('merchant-queue'))
  edit.wrapper.unmount()
})

test('menu empty state offers the first-menu description', async () => {
  serveShop(makeShopDetail({ products: [] }))
  const { wrapper } = await mountApp({ path: '/merchant/menu', user: merchant() })
  await vi.waitFor(() => expect(wrapper.text()).toContain('เพิ่มเมนูแรกของร้านได้เลย'))
  wrapper.unmount()
})

test('create shop has neither cancel nor back link', async () => {
  const { wrapper, router } = await mountApp({
    path: '/merchant/queue',
    user: makeUser({ id: 2, role: 'merchant', shopId: null }),
  })
  expect(router.currentRoute.value.name).toBe('merchant-shop-new')
  const links = wrapper.findAll('a').map((a) => a.text())
  expect(links).not.toContain('ยกเลิก')
  expect(links).not.toContain('กลับ')
  wrapper.unmount()
})
