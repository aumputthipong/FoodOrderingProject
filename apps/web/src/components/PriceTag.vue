<script setup lang="ts">
import { formatPrice } from '@/lib/format'

defineProps<{ value: number }>()
</script>

<template>
  <span class="font-semibold tabular-nums">{{ formatPrice(value) }}</span>
</template>
