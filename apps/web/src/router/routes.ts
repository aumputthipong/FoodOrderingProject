import type { Role } from '@canteen/shared'
import type { RouteMeta, RouteRecordRaw } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    layout: 'customer' | 'merchant' | 'auth'
    requiresAuth?: boolean
    guestOnly?: boolean
    roles?: Role[]
    requiresShop?: boolean
    requiresNoShop?: boolean
    /** merchants and admins are sent to their dashboard instead */
    staffHome?: boolean
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
    meta: { layout: 'customer', staffHome: true },
  },
  {
    path: '/shops/:id',
    name: 'shop',
    component: () => import('@/features/shops/pages/ShopPage.vue'),
    meta: { layout: 'customer' },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/features/cart/pages/CartPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/features/orders/pages/MyOrdersPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('@/features/auth/pages/AccountPage.vue'),
    meta: { layout: 'customer', requiresAuth: true },
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/pages/LoginPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: '/signup',
    name: 'signup',
    component: () => import('@/features/auth/pages/SignupPage.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  { path: '/merchant', redirect: { name: 'merchant-queue' } },
  {
    path: '/merchant/queue',
    name: 'merchant-queue',
    component: () => import('@/features/merchant/pages/QueuePage.vue'),
    meta: { ...merchantMeta, requiresShop: true },
  },
  {
    path: '/merchant/menu',
    name: 'merchant-menu',
    component: () => import('@/features/merchant/pages/MenuPage.vue'),
    meta: { ...merchantMeta, requiresShop: true },
  },
  {
    path: '/merchant/menu/new',
    name: 'merchant-menu-new',
    component: () => import('@/features/merchant/pages/ProductEditPage.vue'),
    meta: { ...merchantMeta, requiresShop: true },
  },
  {
    path: '/merchant/menu/:id/edit',
    name: 'merchant-menu-edit',
    component: () => import('@/features/merchant/pages/ProductEditPage.vue'),
    meta: { ...merchantMeta, requiresShop: true },
  },
  {
    path: '/merchant/shop',
    name: 'merchant-shop',
    component: () => import('@/features/merchant/pages/ShopEditPage.vue'),
    meta: { ...merchantMeta, requiresShop: true },
  },
  {
    path: '/merchant/shop/new',
    name: 'merchant-shop-new',
    component: () => import('@/features/merchant/pages/ShopCreatePage.vue'),
    meta: { ...merchantMeta, requiresNoShop: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { layout: 'customer' },
  },
]
