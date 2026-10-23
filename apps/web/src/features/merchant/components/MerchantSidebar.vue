<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import { merchantLinks } from '../nav'

defineProps<{ shopName: string | null; username: string }>()
</script>

<template>
  <aside
    data-testid="merchant-sidebar"
    class="hidden w-56 shrink-0 flex-col gap-6 border-r border-border bg-card px-4 py-5 lg:flex"
  >
    <div class="flex flex-col gap-1">
      <AppLogo />
      <span class="text-sm text-muted-foreground">สำหรับร้านค้า</span>
    </div>
    <div class="flex items-center gap-2.5 rounded-xl bg-background p-2.5">
      <span class="size-10 shrink-0 rounded-[10px] bg-primary/10" aria-hidden="true" />
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-sm font-semibold">{{ shopName ?? 'ยังไม่มีร้าน' }}</span>
        <span class="truncate text-xs text-muted-foreground">{{ username }}</span>
      </span>
    </div>
    <nav aria-label="เมนูร้าน" class="flex flex-col gap-1">
      <RouterLink
        v-for="link in merchantLinks"
        :key="link.name"
        :to="{ name: link.name }"
        class="flex h-11 items-center rounded-[10px] px-3 text-stone-700"
        active-class="bg-primary/10 font-semibold !text-primary"
        >{{ link.label }}</RouterLink
      >
    </nav>
  </aside>
</template>
