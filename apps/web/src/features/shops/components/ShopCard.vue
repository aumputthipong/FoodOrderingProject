<script setup lang="ts">
import type { Shop } from '@canteen/shared'
import { RouterLink } from 'vue-router'
import ImageWithFallback from '@/components/ImageWithFallback.vue'

defineProps<{ shop: Shop }>()
</script>

<template>
  <RouterLink
    :to="{ name: 'shop', params: { id: shop.id } }"
    class="flex min-h-11 gap-3 rounded-card bg-card p-2.5 text-foreground transition-shadow hover:shadow-md md:flex-col md:gap-0 md:overflow-hidden md:p-0"
  >
    <ImageWithFallback
      :src="shop.imageUrl"
      :alt="shop.name"
      ratio="16/10"
      class="!aspect-square w-[76px] shrink-0 rounded-thumb md:!aspect-[16/10] md:w-full md:rounded-none"
    />
    <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5 md:p-3.5">
      <span class="truncate text-body-sm font-semibold">{{ shop.name }}</span>
      <span class="truncate text-caption text-muted-foreground">{{ shop.description }}</span>
    </div>
  </RouterLink>
</template>
