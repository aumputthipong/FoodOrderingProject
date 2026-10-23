<script setup lang="ts">
import type { Product } from '@canteen/shared'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import PriceTag from '@/components/PriceTag.vue'
import { cn } from '@/lib/utils'
import QuantityStepper from './QuantityStepper.vue'

defineProps<{ product: Product; quantity: number; disabled?: boolean }>()
const emit = defineEmits<{ change: [quantity: number] }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex gap-3 rounded-[14px] border-2 bg-card p-2.5',
        quantity > 0 ? 'border-primary' : 'border-transparent',
        product.status === 'not-available' && 'opacity-60',
      )
    "
  >
    <div class="w-[84px] shrink-0 overflow-hidden rounded-[10px]">
      <ImageWithFallback :src="product.imageUrl" :alt="product.name" ratio="1/1" />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-[15px] font-semibold">{{ product.name }}</span>
      <span v-if="product.description" class="text-[13px] leading-snug text-muted-foreground">{{
        product.description
      }}</span>
      <div class="mt-auto flex items-center justify-between pt-1">
        <PriceTag :value="product.price" class="text-[15px]" />
        <span
          v-if="product.status === 'not-available'"
          class="rounded-md bg-border px-2 py-0.5 text-xs font-semibold text-stone-700"
          >หมดชั่วคราว</span
        >
        <QuantityStepper
          v-else
          :model-value="quantity"
          :label="product.name"
          :disabled="disabled"
          @update:model-value="emit('change', $event)"
        />
      </div>
    </div>
  </div>
</template>
