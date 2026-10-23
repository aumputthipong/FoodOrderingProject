<script setup lang="ts">
import type { Cart } from '@canteen/shared'
import { RouterLink } from 'vue-router'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import PriceTag from '@/components/PriceTag.vue'
import { QuantityStepper } from '@/features/shops'
import { formatPrice } from '@/lib/format'

defineProps<{ cart: Cart; busy: boolean }>()
const emit = defineEmits<{
  changeQuantity: [itemId: number, quantity: number]
  remove: [itemId: number]
  checkout: [cartId: number]
}>()

function onChange(itemId: number, quantity: number): void {
  if (quantity <= 0) emit('remove', itemId)
  else emit('changeQuantity', itemId, quantity)
}
</script>

<template>
  <section class="flex flex-col gap-3 rounded-2xl bg-card p-3.5">
    <div class="flex items-center gap-2.5">
      <div class="size-9 flex-none overflow-hidden rounded-[10px]">
        <ImageWithFallback :src="cart.shop.imageUrl" :alt="cart.shop.name" ratio="1/1" />
      </div>
      <h2 class="min-w-0 flex-1 text-[15px] font-semibold">{{ cart.shop.name }}</h2>
      <RouterLink
        :to="{ name: 'shop', params: { id: cart.shop.id } }"
        class="flex min-h-11 items-center text-[13px] font-medium text-primary"
        >เพิ่มเมนู</RouterLink
      >
    </div>
    <div
      v-for="item in cart.items"
      :key="item.id"
      class="flex items-center gap-2.5 border-t border-background pt-3"
    >
      <div class="size-[52px] flex-none overflow-hidden rounded-lg">
        <ImageWithFallback :src="item.imageUrl" :alt="item.name" ratio="1/1" />
      </div>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <span class="text-sm font-medium">{{ item.name }}</span>
        <span class="text-[13px] text-muted-foreground">{{ formatPrice(item.price) }}</span>
      </div>
      <QuantityStepper
        :model-value="item.quantity"
        :label="item.name"
        :disabled="busy"
        @update:model-value="onChange(item.id, $event)"
      />
    </div>
    <button
      type="button"
      :disabled="busy"
      class="flex min-h-12 items-center justify-between rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
      @click="emit('checkout', cart.id)"
    >
      <span>สั่งอาหารร้านนี้</span>
      <PriceTag :value="cart.totalPrice" />
    </button>
  </section>
</template>
