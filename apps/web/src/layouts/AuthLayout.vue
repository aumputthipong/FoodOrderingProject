<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue'
</script>

<template>
  <div
    data-testid="auth-layout"
    class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-10"
  >
    <AppLogo />
    <main class="w-full max-w-sm"><slot /></main>
  </div>
</template>
