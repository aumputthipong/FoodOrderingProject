<script setup lang="ts">
import { computed } from 'vue'
import type { ShopOrder } from '@canteen/shared'
import PriceTag from '@/components/PriceTag.vue'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { formatMobile, formatPrice, formatTime, formatWait, waitMinutes } from '@/lib/format'

const props = defineProps<{
  order: ShopOrder
  variant: 'waiting' | 'finished'
  now: number
  busy?: boolean
}>()

const emit = defineEmits<{
  toggleItem: [itemId: number, isDone: boolean]
  complete: [orderId: number]
  reopen: [orderId: number]
}>()

const minutes = computed(() => waitMinutes(props.order.createdAt, props.now))
const isLate = computed(() => minutes.value > 10)
</script>

<template>
  <article
    v-if="variant === 'waiting'"
    class="flex flex-col rounded-card border border-border bg-card"
  >
    <div class="flex items-start justify-between gap-2 px-4 pb-3 pt-4">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="font-heading text-ticket font-semibold leading-[1.1] text-primary"
          >#{{ order.queueNumber }}</span
        >
        <span class="truncate text-caption text-muted-foreground"
          >{{ order.customer.firstName }} ·
          <span class="whitespace-nowrap">{{ formatMobile(order.customer.mobile) }}</span></span
        >
      </div>
      <div class="flex shrink-0 flex-col items-end gap-1">
        <span
          data-testid="wait-pill"
          class="whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold"
          :class="isLate ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'"
          >{{ formatWait(minutes) }}</span
        >
        <span class="text-caption text-muted-foreground">{{ formatTime(order.createdAt) }}</span>
      </div>
    </div>
    <div class="mx-3 border-t-2 border-dashed border-border" aria-hidden="true"></div>
    <ul class="flex flex-1 flex-col gap-1 px-4 py-3">
      <li v-for="item in order.items" :key="item.id" class="flex items-center gap-2.5">
        <Checkbox
          :id="`item-${item.id}`"
          :model-value="item.isDone"
          class="size-6"
          @update:model-value="emit('toggleItem', item.id, !item.isDone)"
        />
        <label
          :for="`item-${item.id}`"
          class="flex min-h-11 flex-1 cursor-pointer items-center text-base"
          :class="item.isDone ? 'text-muted-foreground line-through' : ''"
          >{{ item.name }} × {{ item.quantity }}</label
        >
      </li>
    </ul>
    <div class="flex items-center gap-2 px-4 pb-4">
      <PriceTag :value="order.totalPrice" class="flex-1" />
      <Button :disabled="busy" @click="emit('complete', order.id)">เสร็จทั้งออเดอร์</Button>
    </div>
  </article>

  <div v-else class="flex items-center gap-2.5 border-t border-background pt-3">
    <span class="font-heading text-lg font-semibold text-muted-foreground"
      >#{{ order.queueNumber }}</span
    >
    <span class="flex min-w-0 flex-1 flex-col">
      <span class="text-sm">{{
        order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')
      }}</span>
      <span class="text-caption text-muted-foreground"
        >เสร็จ {{ order.finishedAt ? formatTime(order.finishedAt) : '-' }} ·
        {{ formatPrice(order.totalPrice) }}</span
      >
    </span>
    <Button
      variant="outline"
      size="sm"
      class="min-h-11"
      :disabled="busy"
      @click="emit('reopen', order.id)"
      >ย้อนกลับ</Button
    >
  </div>
</template>
