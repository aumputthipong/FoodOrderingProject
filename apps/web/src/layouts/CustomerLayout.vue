<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import BottomNav from '@/components/BottomNav.vue'
import TopNav from '@/components/TopNav.vue'
import { useAuthStore } from '@/features/auth'
import { useCartCount } from '@/features/cart'

const auth = useAuthStore()
const cartCount = useCartCount()
</script>

<template>
  <div class="min-h-dvh bg-background pb-20 md:pb-0">
    <div
      v-if="auth.isMerchant"
      data-testid="staff-preview-bar"
      class="bg-foreground text-background"
    >
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 md:px-6">
        <span class="text-caption">คุณกำลังดูในมุมลูกค้า</span>
        <RouterLink
          :to="{ name: 'merchant-queue' }"
          class="-mr-2 flex min-h-11 items-center gap-1.5 px-2 text-caption font-semibold underline-offset-4 hover:underline"
        >
          <ArrowLeft class="size-4" aria-hidden="true" />กลับไปจัดการร้าน
        </RouterLink>
      </div>
    </div>
    <TopNav :cart-count="cartCount" :user="auth.user" />
    <header class="flex items-center justify-between bg-card px-4 py-3.5 md:hidden">
      <AppLogo />
      <span v-if="auth.user" class="text-caption text-muted-foreground"
        >สวัสดี, {{ auth.user.firstName }}</span
      >
    </header>
    <main class="mx-auto max-w-5xl"><slot /></main>
    <BottomNav :cart-count="cartCount" />
  </div>
</template>
