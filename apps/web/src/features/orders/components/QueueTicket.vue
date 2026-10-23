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
  <article
    :class="
      cn('overflow-hidden rounded-card bg-card shadow-sm', finished && 'ring-2 ring-success/40')
    "
  >
    <div class="flex items-start justify-between gap-3 px-[18px] pb-4 pt-[18px]">
      <div class="flex min-w-0 flex-col gap-0.5">
        <span class="text-caption text-muted-foreground">หมายเลขคิว</span>
        <span
          data-testid="queue-number"
          class="font-heading text-ticket font-semibold leading-[1.1] text-primary"
          >#{{ order.id }}</span
        >
        <span class="text-body-sm font-semibold">{{ order.shop.name }}</span>
        <span class="text-caption text-muted-foreground"
          >สั่งเมื่อ {{ formatTime(order.createdAt) }}</span
        >
      </div>
      <div class="flex flex-col items-end gap-1.5">
        <span
          data-testid="status-pill"
          :class="
            cn(
              'rounded-full px-3 py-1 text-caption font-semibold',
              finished ? 'bg-success text-success-foreground' : 'bg-accent text-accent-foreground',
            )
          "
          >{{ finished ? 'เสร็จแล้ว' : 'กำลังทำ' }}</span
        >
        <span v-if="finished && order.finishedAt" class="text-caption text-muted-foreground"
          >เสร็จ {{ formatTime(order.finishedAt) }}</span
        >
      </div>
    </div>
    <div class="flex items-center" aria-hidden="true">
      <span class="h-7 w-3.5 rounded-r-full bg-background"></span>
      <span class="flex-1 border-t-2 border-dashed border-border"></span>
      <span class="h-7 w-3.5 rounded-l-full bg-background"></span>
    </div>
    <div class="flex flex-col gap-3 px-[18px] pb-[18px] pt-3.5">
      <div class="flex justify-between text-caption text-muted-foreground">
        <span>เสร็จแล้ว {{ doneCount }} จาก {{ order.items.length }} รายการ</span>
        <span>รวม <PriceTag :value="order.totalPrice" /></span>
      </div>
      <div
        role="progressbar"
        aria-label="ความคืบหน้าของออเดอร์"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="percent"
        class="h-1.5 overflow-hidden rounded-[3px] bg-muted"
      >
        <div class="h-full bg-primary" :style="{ width: `${percent}%` }"></div>
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
                ? 'text-caption font-medium text-success'
                : 'text-caption text-muted-foreground'
            "
            >{{ item.isDone ? 'เสร็จ' : 'รอ' }}</span
          >
        </li>
      </ul>
    </div>
    <div
      v-if="finished"
      class="flex items-center justify-center gap-1.5 bg-success/10 px-4 py-3 text-body-sm font-semibold text-success"
    >
      ✓ พร้อมรับที่ร้าน
    </div>
  </article>
</template>
