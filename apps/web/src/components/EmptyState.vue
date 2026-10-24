<script setup lang="ts">
import type { Component } from 'vue'
import { cn } from '@/lib/utils'

defineProps<{ title: string; description?: string; icon?: Component; compact?: boolean }>()
</script>

<template>
  <div :class="cn('flex flex-col items-center gap-2 px-4 text-center', compact ? 'py-6' : 'py-16')">
    <span
      v-if="icon && !compact"
      data-testid="empty-icon"
      class="mb-2 flex size-14 items-center justify-center rounded-full bg-accent/25 text-primary"
    >
      <component :is="icon" class="size-6" aria-hidden="true" />
    </span>
    <h2 :class="compact ? 'text-body-sm font-semibold' : 'font-heading text-title font-semibold'">
      {{ title }}
    </h2>
    <p v-if="description" class="text-body-sm text-muted-foreground">{{ description }}</p>
    <div v-if="$slots.action" class="mt-3"><slot name="action" /></div>
  </div>
</template>
