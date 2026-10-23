<script setup lang="ts">
import { computed } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import OrderCard from '../components/OrderCard.vue'
import {
  useSetOrderStatusMutation,
  useShopOrdersQuery,
  useToggleOrderItemMutation,
} from '../queries'

const { data, isPending, error, refetch } = useShopOrdersQuery()
const toggle = useToggleOrderItemMutation()
const setStatus = useSetOrderStatusMutation()

const isEmpty = computed(
  () => !!data.value && !data.value.waiting.length && !data.value.finished.length,
)

function busy(orderId: number): boolean {
  return setStatus.isPending.value && setStatus.variables.value?.id === orderId
}
</script>

<template>
  <div class="flex flex-col gap-6 p-4 lg:p-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="font-heading text-[26px] font-semibold">คิวออเดอร์</h1>
        <p class="text-muted-foreground">คิวเก่าอยู่ก่อน ติ๊กทีละรายการเมื่อทำเสร็จ</p>
      </div>
      <div v-if="data" class="flex gap-2.5">
        <span class="rounded-[10px] border border-border bg-card px-3.5 py-2 text-sm"
          >รอทำ <strong class="text-primary">{{ data.waiting.length }}</strong></span
        >
        <span class="rounded-[10px] border border-border bg-card px-3.5 py-2 text-sm"
          >เสร็จแล้ว <strong>{{ data.finished.length }}</strong></span
        >
      </div>
    </div>

    <ErrorState v-if="error && !data" :error="error" @retry="refetch()" />
    <div v-else-if="isPending || !data" class="grid gap-4 sm:grid-cols-2">
      <Skeleton class="h-64 rounded-2xl" />
      <Skeleton class="h-64 rounded-2xl" />
    </div>
    <EmptyState v-else-if="isEmpty" title="ยังไม่มีออเดอร์" />
    <div v-else class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section
        aria-label="รอทำ"
        class="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 lg:flex-1"
      >
        <OrderCard
          v-for="order in data.waiting"
          :key="order.id"
          :order="order"
          variant="waiting"
          :busy="busy(order.id)"
          @toggle-item="(itemId, isDone) => toggle.mutate({ itemId, isDone })"
          @complete="(id) => setStatus.mutate({ id, status: 'finished' })"
        />
      </section>
      <aside
        aria-label="เสร็จแล้ว"
        class="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 lg:w-72 lg:flex-none"
      >
        <h2 class="text-[15px] font-semibold">เสร็จแล้ว</h2>
        <OrderCard
          v-for="order in data.finished"
          :key="order.id"
          :order="order"
          variant="finished"
          :busy="busy(order.id)"
          @reopen="(id) => setStatus.mutate({ id, status: 'waiting' })"
        />
      </aside>
    </div>
  </div>
</template>
