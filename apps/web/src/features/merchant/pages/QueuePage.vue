<script setup lang="ts">
import { ClipboardList } from '@lucide/vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { computed } from 'vue'
import { toast } from 'vue-sonner'
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

const now = useNow({ scheduler: (tick) => useIntervalFn(tick, 30_000) })

const isEmpty = computed(
  () => !!data.value && !data.value.waiting.length && !data.value.finished.length,
)

async function complete(id: number): Promise<void> {
  try {
    await setStatus.mutateAsync({ id, status: 'finished' })
  } catch {
    return // the mutation-level onError already showed the error toast
  }
  toast.success(`คิว #${id} เสร็จแล้ว`, {
    action: {
      label: 'ย้อนกลับ',
      onClick: () => setStatus.mutate({ id, status: 'waiting' }),
    },
  })
}

function busy(orderId: number): boolean {
  return setStatus.isPending.value && setStatus.variables.value?.id === orderId
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="page-title-lg">คิวออเดอร์</h1>
        <p class="text-muted-foreground">คิวเก่าอยู่ก่อน ติ๊กทีละรายการเมื่อทำเสร็จ</p>
      </div>
      <div v-if="data" class="flex gap-2.5">
        <span class="rounded-thumb border border-border bg-card px-3.5 py-2 text-sm"
          >รอทำ <strong class="text-primary">{{ data.waiting.length }}</strong></span
        >
        <span class="rounded-thumb border border-border bg-card px-3.5 py-2 text-sm"
          >เสร็จแล้ว <strong>{{ data.finished.length }}</strong></span
        >
      </div>
    </div>

    <ErrorState v-if="error && !data" :error="error" @retry="refetch()" />
    <div v-else-if="isPending || !data" class="grid gap-4 sm:grid-cols-2">
      <Skeleton class="h-64 rounded-card" />
      <Skeleton class="h-64 rounded-card" />
    </div>
    <EmptyState
      v-else-if="isEmpty"
      :icon="ClipboardList"
      title="ยังไม่มีออเดอร์"
      description="ออเดอร์ใหม่จะแสดงที่นี่อัตโนมัติ"
    />
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
          :now="now.getTime()"
          :busy="busy(order.id)"
          @toggle-item="(itemId, isDone) => toggle.mutate({ itemId, isDone })"
          @complete="complete"
        />
      </section>
      <aside
        aria-label="เสร็จแล้ว"
        class="flex flex-col gap-3 rounded-card border border-border bg-card p-4 lg:w-72 lg:flex-none"
      >
        <h2 class="text-body-sm font-semibold">เสร็จแล้ว</h2>
        <EmptyState v-if="!data.finished.length" compact title="ยังไม่มีออเดอร์ที่เสร็จ" />
        <OrderCard
          v-for="order in data.finished"
          :key="order.id"
          :order="order"
          variant="finished"
          :now="now.getTime()"
          :busy="busy(order.id)"
          @reopen="(id) => setStatus.mutate({ id, status: 'waiting' })"
        />
      </aside>
    </div>
  </div>
</template>
