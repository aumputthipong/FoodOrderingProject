<script setup lang="ts">
import { useRouter } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import BottomNav from '@/components/BottomNav.vue'
import TopNav from '@/components/TopNav.vue'
import { useAuthStore } from '@/features/auth'

const auth = useAuthStore()
const router = useRouter()

async function onLogout(): Promise<void> {
  await auth.logout()
  await router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-dvh bg-background pb-20 md:pb-0">
    <TopNav :cart-count="0" :user="auth.user" @logout="onLogout" />
    <header class="flex items-center justify-between bg-card px-4 py-3.5 md:hidden">
      <AppLogo />
      <span v-if="auth.user" class="text-[13px] text-muted-foreground"
        >สวัสดี, {{ auth.user.firstName }}</span
      >
    </header>
    <main class="mx-auto max-w-5xl"><slot /></main>
    <BottomNav :cart-count="0" />
  </div>
</template>
