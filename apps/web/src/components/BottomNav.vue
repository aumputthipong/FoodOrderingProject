<script setup lang="ts">
import { House, ShoppingCart, Ticket, User } from '@lucide/vue'
import { RouterLink } from 'vue-router'

defineProps<{ cartCount: number }>()

const linkClass =
  'flex min-h-11 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent py-1.5 text-xs text-muted-foreground'
const activeClass = 'font-semibold !border-primary !text-primary'
</script>

<template>
  <nav
    data-testid="bottom-nav"
    aria-label="เมนูหลัก"
    class="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <RouterLink
      :to="{ name: 'home' }"
      :class="linkClass"
      :active-class="activeClass"
      :exact-active-class="activeClass"
    >
      <House class="size-[22px]" aria-hidden="true" />หน้าแรก
    </RouterLink>
    <RouterLink :to="{ name: 'cart' }" :class="linkClass" :active-class="activeClass">
      <span class="relative">
        <ShoppingCart class="size-[22px]" aria-hidden="true" />
        <span
          v-if="cartCount > 0"
          class="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] text-primary-foreground"
          >{{ cartCount }}</span
        >
      </span>
      ตะกร้า
    </RouterLink>
    <RouterLink :to="{ name: 'orders' }" :class="linkClass" :active-class="activeClass">
      <Ticket class="size-[22px]" aria-hidden="true" />คิวของฉัน
    </RouterLink>
    <RouterLink :to="{ name: 'account' }" :class="linkClass" :active-class="activeClass">
      <User class="size-[22px]" aria-hidden="true" />บัญชี
    </RouterLink>
  </nav>
</template>
