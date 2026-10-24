<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
</script>

<template>
  <div
    data-testid="auth-layout"
    class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10"
  >
    <RouterLink :to="{ name: 'home' }" class="inline-flex min-h-11 items-center">
      <AppLogo />
    </RouterLink>
    <main class="w-full max-w-sm"><slot /></main>
    <RouterLink
      :to="{ name: 'home' }"
      class="inline-flex min-h-11 items-center gap-1 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />
      กลับไปเลือกร้าน
    </RouterLink>
  </div>
</template>
