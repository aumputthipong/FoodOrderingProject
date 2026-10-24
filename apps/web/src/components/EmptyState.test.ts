import { Ticket } from '@lucide/vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { expect, test } from 'vitest'
import ErrorState from '@/components/ErrorState.vue'
import EmptyState from '@/components/EmptyState.vue'
import NotFoundPage from '@/pages/NotFoundPage.vue'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/shops', name: 'shops', component: { template: '<div />' } },
    ],
  })
}

test('EmptyState renders icon, description and action', () => {
  const wrapper = mount(EmptyState, {
    props: { title: 'ยังไม่มีคิว', description: 'สั่งอาหารเพื่อรับคิว', icon: Ticket },
    slots: { action: '<button>สั่งเลย</button>' },
  })
  expect(wrapper.text()).toContain('ยังไม่มีคิว')
  expect(wrapper.text()).toContain('สั่งอาหารเพื่อรับคิว')
  expect(wrapper.find('[data-testid="empty-icon"] svg').exists()).toBe(true)
  expect(wrapper.find('button').text()).toBe('สั่งเลย')
})

test('EmptyState without icon renders no icon circle', () => {
  const wrapper = mount(EmptyState, { props: { title: 'x' } })
  expect(wrapper.find('[data-testid="empty-icon"]').exists()).toBe(false)
})

test('EmptyState compact is tighter, has no icon circle and a smaller title', () => {
  const wrapper = mount(EmptyState, {
    props: { title: 'ยังไม่มีออเดอร์ที่เสร็จ', icon: Ticket, compact: true },
  })
  expect(wrapper.find('[data-testid="empty-icon"]').exists()).toBe(false)
  expect(wrapper.classes()).toContain('py-6')
  expect(wrapper.classes()).not.toContain('py-16')
  expect(wrapper.get('h2').classes()).toContain('text-body-sm')
})

test('ErrorState shows an icon with the Thai message and emits retry', async () => {
  const wrapper = mount(ErrorState, { props: { error: new Error('boom') } })
  expect(wrapper.find('svg').exists()).toBe(true)
  expect(wrapper.find('[role="alert"]').text()).toContain('ลองใหม่')
  await wrapper.find('button').trigger('click')
  expect(wrapper.emitted('retry')).toHaveLength(1)
})

test('NotFoundPage shows defaults and the #404 ticket', async () => {
  const router = makeRouter()
  const wrapper = mount(NotFoundPage, { global: { plugins: [router] } })
  expect(wrapper.text()).toContain('#404')
  expect(wrapper.text()).toContain('ไม่พบหน้าที่ค้นหา')
  expect(wrapper.text()).toContain('หน้านี้อาจถูกย้ายหรือไม่มีอยู่แล้ว')
  expect(wrapper.find('a').text()).toBe('กลับหน้าแรก')
  expect(wrapper.find('a').attributes('href')).toBe('/')
})

test('NotFoundPage accepts a custom title and action', () => {
  const router = makeRouter()
  const wrapper = mount(NotFoundPage, {
    props: {
      title: 'ไม่พบร้านนี้',
      description: 'ร้านอาจปิดแล้ว',
      actionLabel: 'ดูร้านทั้งหมด',
      actionTo: { name: 'shops' },
    },
    global: { plugins: [router] },
  })
  expect(wrapper.text()).toContain('ไม่พบร้านนี้')
  expect(wrapper.text()).toContain('ร้านอาจปิดแล้ว')
  expect(wrapper.find('a').text()).toBe('ดูร้านทั้งหมด')
  expect(wrapper.find('a').attributes('href')).toBe('/shops')
})
