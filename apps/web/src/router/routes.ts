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

// Pages that have not been built yet render the shared placeholder showing meta.title.
const placeholder = () => import('@/pages/PlaceholderPage.vue')

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
    component: placeholder,
    meta: { layout: 'customer', requiresAuth: true, title: 'ตะกร้า' },
  },
  {
    path: '/orders',
    name: 'orders',
    component: placeholder,
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
    component: placeholder,
    meta: { ...merchantMeta, requiresShop: true, title: 'คิวออเดอร์' },
  },
  {
    path: '/merchant/menu',
    name: 'merchant-menu',
    component: placeholder,
    meta: { ...merchantMeta, requiresShop: true, title: 'เมนูในร้าน' },
  },
  {
    path: '/merchant/menu/new',
    name: 'merchant-menu-new',
    component: placeholder,
    meta: { ...merchantMeta, requiresShop: true, title: 'เพิ่มเมนู' },
  },
  {
    path: '/merchant/menu/:id/edit',
    name: 'merchant-menu-edit',
    component: placeholder,
    meta: { ...merchantMeta, requiresShop: true, title: 'แก้ไขเมนู' },
  },
  {
    path: '/merchant/shop',
    name: 'merchant-shop',
    component: placeholder,
    meta: { ...merchantMeta, requiresShop: true, title: 'ข้อมูลร้าน' },
  },
  {
    path: '/merchant/shop/new',
    name: 'merchant-shop-new',
    component: placeholder,
    meta: { ...merchantMeta, requiresNoShop: true, title: 'สร้างร้าน' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { layout: 'customer' },
  },
]
