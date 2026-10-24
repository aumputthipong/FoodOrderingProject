<script setup lang="ts">
import type { Product } from '@canteen/shared'
import { computed } from 'vue'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import PriceTag from '@/components/PriceTag.vue'
import SoldOutBadge from '@/components/SoldOutBadge.vue'
import { cn } from '@/lib/utils'
import QuantityStepper from './QuantityStepper.vue'

const props = defineProps<{ product: Product; quantity: number; disabled?: boolean }>()
const soldOut = computed(() => props.product.status === 'not-available')
const emit = defineEmits<{ change: [quantity: number] }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex gap-3 rounded-card border-2 bg-card p-2.5',
        quantity > 0 ? 'border-primary' : 'border-transparent',
      )
    "
  >
    <div class="w-[84px] shrink-0 overflow-hidden rounded-thumb">
      <ImageWithFallback
        :src="product.imageUrl"
        :alt="product.name"
        ratio="1/1"
        :class="soldOut ? 'grayscale' : undefined"
      />
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span
        :class="cn('line-clamp-2 text-body-sm font-semibold', soldOut && 'text-muted-foreground')"
        >{{ product.name }}</span
      >
      <span
        v-if="product.description"
        class="line-clamp-2 text-caption leading-snug text-muted-foreground"
        >{{ product.description }}</span
      >
      <div class="mt-auto flex items-center justify-between pt-1">
        <PriceTag :value="product.price" class="text-body-sm" />
        <SoldOutBadge v-if="soldOut" />
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
