<script setup lang="ts">
import type { Product } from '@canteen/shared'
import { Plus } from '@lucide/vue'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import PriceTag from '@/components/PriceTag.vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ product: Product; quantity: number; disabled?: boolean }>()
const emit = defineEmits<{ change: [quantity: number] }>()
</script>

<template>
  <div
    :class="
      cn(
        'flex gap-3 rounded-[14px] bg-card p-2.5',
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
        <slot v-else>
          <button
            type="button"
            :aria-label="`เพิ่ม ${product.name} ลงตะกร้า`"
            :disabled="disabled"
            class="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
            @click="emit('change', props.quantity + 1)"
          >
            <Plus class="size-5" aria-hidden="true" />
          </button>
        </slot>
      </div>
    </div>
  </div>
</template>
