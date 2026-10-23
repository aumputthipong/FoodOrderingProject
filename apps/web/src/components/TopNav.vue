<script setup lang="ts">
import type { User } from '@canteen/shared'
import { ShoppingCart } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

defineProps<{ cartCount: number; user: User | null }>()
defineEmits<{ logout: [] }>()

const linkClass =
  'flex min-h-11 items-center rounded-md px-3 text-sm text-muted-foreground hover:text-foreground'
const activeClass = 'font-semibold !text-primary'
</script>

<template>
  <header data-testid="top-nav" class="hidden border-b border-border bg-card md:block">
    <div class="mx-auto flex max-w-5xl items-center gap-2 px-6 py-2">
      <RouterLink :to="{ name: 'home' }" class="mr-4 flex min-h-11 items-center">
        <AppLogo />
      </RouterLink>
      <nav aria-label="เมนูหลัก" class="flex flex-1 items-center gap-1">
        <RouterLink
          :to="{ name: 'home' }"
          :class="linkClass"
          :active-class="activeClass"
          :exact-active-class="activeClass"
          >หน้าแรก</RouterLink
        >
        <RouterLink :to="{ name: 'orders' }" :class="linkClass" :active-class="activeClass"
          >คิวของฉัน</RouterLink
        >
      </nav>
      <RouterLink
        :to="{ name: 'cart' }"
        aria-label="ตะกร้า"
        :class="cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'relative')"
      >
        <ShoppingCart aria-hidden="true" />
        <span
          v-if="cartCount > 0"
          class="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground"
          >{{ cartCount }}</span
        >
      </RouterLink>
      <template v-if="user">
        <RouterLink :to="{ name: 'account' }" :class="linkClass">{{ user.firstName }}</RouterLink>
        <Button variant="outline" @click="$emit('logout')">ออกจากระบบ</Button>
      </template>
      <RouterLink v-else :to="{ name: 'login' }" :class="cn(buttonVariants())"
        >เข้าสู่ระบบ</RouterLink
      >
    </div>
  </header>
</template>
