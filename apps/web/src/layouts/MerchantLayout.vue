<script setup lang="ts">
import { House } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/features/auth'
import MerchantSidebar from '@/features/merchant/components/MerchantSidebar.vue'
import { merchantLinks } from '@/features/merchant/nav'

const auth = useAuthStore()
</script>

<template>
  <div class="flex min-h-dvh bg-background">
    <MerchantSidebar :shop-name="null" :username="auth.user?.username ?? ''" />
    <div class="flex min-w-0 flex-1 flex-col">
      <nav
        aria-label="เมนูร้าน"
        class="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 lg:hidden"
      >
        <RouterLink
          v-for="link in merchantLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="flex min-h-11 shrink-0 items-center px-3 text-sm text-muted-foreground"
          active-class="font-semibold !text-primary"
          >{{ link.label }}</RouterLink
        >
      </nav>
      <div class="flex justify-end px-4 pt-3 lg:px-8">
        <RouterLink
          :to="{ name: 'home' }"
          class="flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <House class="size-4" aria-hidden="true" />ไปหน้าลูกค้า
        </RouterLink>
      </div>
      <main class="min-w-0 flex-1 px-4 pb-12 lg:px-8"><slot /></main>
    </div>
  </div>
</template>
