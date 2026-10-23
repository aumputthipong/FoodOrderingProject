import type { Role } from '@canteen/shared'
import type { RouteMeta, RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    layout: 'customer' | 'merchant' | 'auth'
    title?: string
    requiresAuth?: boolean
    guestOnly?: boolean
    roles?: Role[]
    requiresShop?: boolean
    requiresNoShop?: boolean
  }
}

const merchantMeta: RouteMeta = {
  layout: 'merchant',
  requiresAuth: true,
  roles: ['merchant', 'admin'],
}

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/features/shops/pages/HomePage.vue'),
    meta: { layout: 'customer', title: 'หน้าแรก' },
  },
  {
    path: '/shops/:id',
    name: 'shop',
    component: () => import('@/features/shops/pages/ShopPage.vue'),
    meta: { layout: 'customer', title: 'หน้าร้าน' },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/features/cart/pages/CartPage.vue'),
    meta: { layout: 'customer', requiresAuth: true, title: 'ตะกร้า' },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/features/orders/pages/MyOrdersPage.vue'),
    meta: { layout: 'customer', requiresAuth: true, title: 'คิวของฉัน' },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/features/auth/pages/AccountPage.vue'),
    meta: { layout: 'customer', requiresAuth: true, title: 'บัญชี' },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
    meta: { layout: 'auth', guestOnly: true, title: 'เข้าสู่ระบบ' },
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/features/auth/pages/SignupPage.vue'),
    meta: { layout: 'auth', guestOnly: true, title: 'สมัครสมาชิก' },
  },
  { path: '/merchant', redirect: { name: 'merchant-queue' } },
  {
    path: '/merchant/queue',
    name: 'merchant-queue',
    component: () => import('@/features/merchant/pages/QueuePage.vue'),
    meta: { ...merchantMeta, requiresShop: true, title: 'คิวออเดอร์' },
  },
  {
    path: '/merchant/menu',
    name: 'merchant-menu',
    component: () => import('@/features/merchant/pages/MenuPage.vue'),
    meta: { ...merchantMeta, requiresShop: true, title: 'เมนูในร้าน' },
  },
  {
    path: '/merchant/menu/new',
    name: 'merchant-menu-new',
    component: () => import('@/features/merchant/pages/ProductEditPage.vue'),
    meta: { ...merchantMeta, requiresShop: true, title: 'เพิ่มเมนู' },
  },
  {
    path: '/merchant/menu/:id/edit',
    name: 'merchant-menu-edit',
    component: () => import('@/features/merchant/pages/ProductEditPage.vue'),
    meta: { ...merchantMeta, requiresShop: true, title: 'แก้ไขเมนู' },
  },
  {
    path: '/merchant/shop',
    name: 'merchant-shop',
    component: () => import('@/features/merchant/pages/ShopEditPage.vue'),
    meta: { ...merchantMeta, requiresShop: true, title: 'ข้อมูลร้าน' },
  },
  {
    path: '/merchant/shop/new',
    name: 'merchant-shop-new',
    component: () => import('@/features/merchant/pages/ShopCreatePage.vue'),
    meta: { ...merchantMeta, requiresNoShop: true, title: 'สร้างร้าน' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { layout: 'customer' },
  },
]
