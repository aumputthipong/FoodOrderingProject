<script setup lang="ts">
import type { Order } from '@canteen/shared'
import { Check } from '@lucide/vue'
import { computed } from 'vue'
import PriceTag from '@/components/PriceTag.vue'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const props = defineProps<{ order: Order }>()

const doneCount = computed(() => props.order.items.filter((item) => item.isDone).length)
const percent = computed(() =>
  props.order.items.length === 0
    ? 0
    : Math.round((doneCount.value / props.order.items.length) * 100),
)
const finished = computed(() => props.order.status === 'finished')
</script>

<template>
  <article class="rounded-[18px] bg-card shadow-sm">
    <div class="flex items-start justify-between gap-3 px-[18px] pb-4 pt-[18px]">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="text-[13px] text-muted-foreground">หมายเลขคิว</span>
        <span
          data-testid="queue-number"
          class="font-heading text-[52px] font-semibold leading-[1.1] text-primary"
          >#{{ order.id }}</span
        >
        <span class="text-[15px] font-semibold">{{ order.shop.name }}</span>
        <span class="text-[13px] text-muted-foreground"
          >สั่งเมื่อ {{ formatTime(order.createdAt) }}</span
        >
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <span
          data-testid="status-pill"
          :class="
            cn(
              'rounded-full px-3 py-1 text-[13px] font-semibold',
              finished ? 'bg-success text-success-foreground' : 'bg-accent text-accent-foreground',
            )
          "
          >{{ finished ? 'เสร็จแล้ว' : 'กำลังทำ' }}</span
        >
        <span v-if="finished && order.finishedAt" class="text-[13px] text-muted-foreground"
          >เสร็จ {{ formatTime(order.finishedAt) }}</span
        >
      </div>
    </div>
    <div class="flex items-center" aria-hidden="true">
      <span class="h-6 w-3 rounded-r-full bg-background"></span>
      <span class="flex-1 border-t-2 border-dashed border-border"></span>
      <span class="h-6 w-3 rounded-l-full bg-background"></span>
    </div>
    <div class="flex flex-col gap-3 px-[18px] pb-[18px] pt-3.5">
      <div class="flex justify-between text-[13px] text-muted-foreground">
        <span>เสร็จแล้ว {{ doneCount }} จาก {{ order.items.length }} รายการ</span>
        <span>รวม <PriceTag :value="order.totalPrice" /></span>
      </div>
      <div
        role="progressbar"
        aria-label="ความคืบหน้าของออเดอร์"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percent"
        class="h-1.5 overflow-hidden rounded-[3px] bg-background"
      >
        <div class="h-full bg-primary transition-[width]" :style="{ width: `${percent}%` }"></div>
      </div>
      <ul class="flex flex-col gap-3">
        <li v-for="item in order.items" :key="item.id" class="flex items-center gap-2.5">
          <span
            v-if="item.isDone"
            class="flex size-[22px] flex-none items-center justify-center rounded-full bg-success text-success-foreground"
          >
            <Check class="size-3.5" stroke-width="3" aria-hidden="true" />
          </span>
          <span
            v-else
            class="size-[22px] flex-none rounded-full border-2 border-input"
            aria-hidden="true"
          ></span>
          <span class="flex-1">{{ item.name }} × {{ item.quantity }}</span>
          <span
            :class="
              item.isDone
                ? 'text-[13px] font-medium text-success'
                : 'text-[13px] text-muted-foreground'
            "
            >{{ item.isDone ? 'เสร็จ' : 'รอ' }}</span
          >
        </li>
      </ul>
    </div>
  </article>
</template>
