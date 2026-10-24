<script setup lang="ts">
import { Ticket } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import QueueTicket from '../components/QueueTicket.vue'
import { useMyOrdersQuery } from '../queries'

const { data, isPending, error, refetch } = useMyOrdersQuery()
const triggerClass =
  'h-11 flex-none rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none'
</script>

<template>
  <div class="flex flex-col gap-4 p-4 md:mx-auto md:max-w-3xl">
    <h1 class="page-title">คิวของฉัน</h1>
    <ErrorState v-if="error && !data" :error="error" @retry="refetch()" />
    <div v-else-if="isPending || !data" class="flex flex-col gap-4">
      <Skeleton class="h-72 w-full rounded-card" />
    </div>
    <Tabs v-else default-value="waiting" class="gap-4">
      <TabsList class="grid h-11 w-full grid-cols-2 md:w-80 rounded-none bg-transparent p-0">
        <TabsTrigger value="waiting" :class="triggerClass"
          >กำลังทำ ({{ data.waiting.length }})</TabsTrigger
        >
        <TabsTrigger value="finished" :class="triggerClass"
          >เสร็จแล้ว ({{ data.finished.length }})</TabsTrigger
        >
      </TabsList>
      <TabsContent
        v-for="tab in ['waiting', 'finished'] as const"
        :key="tab"
        :value="tab"
        class="flex flex-col gap-4"
      >
        <EmptyState
          v-if="data[tab].length === 0 && tab === 'waiting'"
          :icon="Ticket"
          title="ยังไม่มีคิวที่กำลังทำ"
          description="สั่งอาหารแล้วคิวจะแสดงที่นี่"
        >
          <template #action>
            <Button as-child>
              <RouterLink :to="{ name: 'home' }">ไปเลือกร้าน</RouterLink>
            </Button>
          </template>
        </EmptyState>
        <EmptyState v-else-if="data[tab].length === 0" :icon="Ticket" title="ยังไม่มีคิวที่เสร็จ" />
        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <QueueTicket v-for="order in data[tab]" :key="order.id" :order="order" />
        </div>
        <p
          v-if="tab === 'waiting' && data.waiting.length > 0"
          class="text-center text-caption leading-relaxed text-muted-foreground"
        >
          เมื่ออาหารเสร็จครบ คิวจะย้ายไปที่ "เสร็จแล้ว" ไปรับที่ร้านได้เลย
        </p>
      </TabsContent>
    </Tabs>
  </div>
</template>
