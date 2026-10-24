<script setup lang="ts">
import { Pencil } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import PriceTag from '@/components/PriceTag.vue'
import SoldOutBadge from '@/components/SoldOutBadge.vue'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/features/auth'
import { useShopQuery } from '@/features/shops'
import { cn } from '@/lib/utils'
import { useSetProductStatusMutation } from '../queries'

const auth = useAuthStore()
const { data: shop, error, refetch } = useShopQuery(() => auth.user?.shopId ?? null)
const setStatus = useSetProductStatusMutation()

function toggle(productId: number, open: boolean) {
  if (!shop.value) return
  setStatus.mutate({
    shopId: shop.value.id,
    id: productId,
    status: open ? 'available' : 'not-available',
  })
}
</script>

<template>
  <div class="flex max-w-3xl flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <h1 class="font-heading text-display font-semibold">เมนูในร้าน</h1>
      <RouterLink :to="{ name: 'merchant-menu-new' }" :class="cn(buttonVariants(), 'min-h-11')"
        >เพิ่มเมนู</RouterLink
      >
    </div>

    <ErrorState v-if="error && !shop" :error="error" @retry="refetch()" />
    <div v-else-if="!shop" class="flex flex-col gap-3">
      <Skeleton class="h-20 w-full rounded-card" />
      <Skeleton class="h-20 w-full rounded-card" />
    </div>
    <EmptyState
      v-else-if="!shop.products.length"
      title="ยังไม่มีเมนู"
      description="เพิ่มเมนูแรกของร้านได้เลย"
    >
      <template #action>
        <RouterLink :to="{ name: 'merchant-menu-new' }" :class="cn(buttonVariants(), 'min-h-11')"
          >เพิ่มเมนู</RouterLink
        >
      </template>
    </EmptyState>
    <ul v-else class="flex flex-col gap-3">
      <li
        v-for="product in shop.products"
        :key="product.id"
        class="flex items-center gap-3 rounded-card border border-border bg-card p-3"
      >
        <div class="size-16 shrink-0 overflow-hidden rounded-thumb">
          <ImageWithFallback
            :src="product.imageUrl"
            :alt="product.name"
            ratio="1/1"
            :class="product.status === 'available' ? undefined : 'grayscale'"
          />
        </div>
        <div class="flex min-w-0 flex-1 flex-col items-start gap-0.5">
          <span
            :class="
              cn(
                'max-w-full truncate font-medium',
                product.status !== 'available' && 'text-muted-foreground',
              )
            "
            >{{ product.name }}</span
          >
          <SoldOutBadge v-if="product.status !== 'available'" />
          <PriceTag :value="product.price" class="text-sm text-primary" />
        </div>
        <div class="flex items-center gap-2">
          <label :for="`product-${product.id}-switch`" class="text-sm">{{
            product.status === 'available' ? 'เปิดขาย' : 'หมดชั่วคราว'
          }}</label>
          <Switch
            :id="`product-${product.id}-switch`"
            :aria-label="`เปิดขาย ${product.name}`"
            :model-value="product.status === 'available'"
            @update:model-value="(open) => toggle(product.id, open === true)"
          />
        </div>
        <RouterLink
          :to="{ name: 'merchant-menu-edit', params: { id: product.id } }"
          :class="cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-1.5')"
          ><Pencil class="size-4" aria-hidden="true" />แก้ไข</RouterLink
        >
      </li>
    </ul>
  </div>
</template>
