<script setup lang="ts">
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
