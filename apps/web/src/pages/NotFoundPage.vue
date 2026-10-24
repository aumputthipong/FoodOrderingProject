<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    actionLabel?: string
    actionTo?: RouteLocationRaw
  }>(),
  {
    title: 'ไม่พบหน้าที่ค้นหา',
    description: 'หน้านี้อาจถูกย้ายหรือไม่มีอยู่แล้ว',
    actionLabel: 'กลับหน้าแรก',
    actionTo: () => ({ name: 'home' }),
  },
)
</script>

<template>
  <div class="flex flex-col items-center gap-2 px-4 py-12 text-center">
    <div class="mb-4 w-44 rounded-card bg-card shadow-sm" aria-hidden="true">
      <div class="flex flex-col items-center gap-0.5 px-4 pb-3 pt-4">
        <span class="text-caption text-muted-foreground">หมายเลขคิว</span>
        <span class="font-heading text-ticket font-semibold leading-none text-primary">#404</span>
      </div>
      <div class="flex items-center">
        <span class="h-5 w-2.5 rounded-r-full bg-background"></span>
        <span class="flex-1 border-t-2 border-dashed border-border"></span>
        <span class="h-5 w-2.5 rounded-l-full bg-background"></span>
      </div>
      <div class="h-3"></div>
    </div>
    <h2 class="font-heading text-title font-semibold">{{ title }}</h2>
    <p class="text-body-sm text-muted-foreground">{{ description }}</p>
    <div class="mt-3">
      <RouterLink :to="actionTo" :class="cn(buttonVariants())">{{ actionLabel }}</RouterLink>
    </div>
  </div>
</template>
