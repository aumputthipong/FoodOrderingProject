<script setup lang="ts">
import { Pencil, Plus, UtensilsCrossed } from '@lucide/vue'
import { computed } from 'vue'
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

const openCount = computed(
  () => shop.value?.products.filter((product) => product.status === 'available').length ?? 0,
)

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
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="page-title-lg">เมนูในร้าน</h1>
        <p v-if="shop?.products.length" class="text-muted-foreground">
          {{ shop.products.length }} เมนู · เปิดขาย {{ openCount
          }}<template v-if="openCount < shop.products.length">
            · หมดชั่วคราว {{ shop.products.length - openCount }}</template
          >
        </p>
      </div>
      <RouterLink
        :to="{ name: 'merchant-menu-new' }"
        :class="cn(buttonVariants(), 'min-h-11 gap-1.5')"
        ><Plus class="size-4" aria-hidden="true" />เพิ่มเมนู</RouterLink
      >
    </div>

    <ErrorState v-if="error && !shop" :error="error" @retry="refetch()" />
    <div
      v-else-if="!shop"
      class="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:gap-4"
    >
      <Skeleton v-for="n in 3" :key="n" class="h-20 rounded-card md:h-72" />
    </div>
    <EmptyState
      v-else-if="!shop.products.length"
      :icon="UtensilsCrossed"
      title="ยังไม่มีเมนู"
      description="เพิ่มเมนูแรกของร้านได้เลย"
    >
      <template #action>
        <RouterLink :to="{ name: 'merchant-menu-new' }" :class="cn(buttonVariants(), 'min-h-11')"
          >เพิ่มเมนู</RouterLink
        >
      </template>
    </EmptyState>
    <ul v-else class="grid gap-3 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))] md:gap-4">
      <li
        v-for="product in shop.products"
        :key="product.id"
        data-testid="menu-item"
        class="flex items-center gap-3 rounded-card border border-border bg-card p-3 md:flex-col md:items-stretch md:gap-0 md:overflow-hidden md:p-0"
      >
        <div
          class="relative size-16 shrink-0 overflow-hidden rounded-thumb md:size-auto md:rounded-none"
        >
          <ImageWithFallback
            :src="product.imageUrl"
            :alt="product.name"
            ratio="4/3"
            :class="
              cn('!aspect-square md:!aspect-[4/3]', product.status !== 'available' && 'grayscale')
            "
          />
        </div>
        <div class="flex min-w-0 flex-1 flex-col items-start gap-0.5 md:px-4 md:pt-3.5">
          <span
            :class="
              cn(
                'max-w-full truncate font-semibold',
                product.status !== 'available' && 'text-muted-foreground',
              )
            "
            >{{ product.name }}</span
          >
          <span
            v-if="product.description"
            class="hidden text-caption leading-snug text-muted-foreground md:line-clamp-2"
            >{{ product.description }}</span
          >
          <SoldOutBadge v-if="product.status !== 'available'" />
          <PriceTag :value="product.price" class="text-sm text-primary md:mt-1 md:text-body-sm" />
        </div>
        <div
          class="flex items-center gap-2 md:mt-auto md:justify-between md:border-t md:border-border md:px-4 md:py-2"
        >
          <div class="flex items-center gap-2">
            <Switch
              :id="`product-${product.id}-switch`"
              :model-value="product.status === 'available'"
              @update:model-value="(open) => toggle(product.id, open === true)"
            />
            <label :for="`product-${product.id}-switch`" class="flex min-h-11 items-center text-sm"
              >เปิดขาย <span class="sr-only">{{ product.name }}</span></label
            >
          </div>
          <RouterLink
            :to="{ name: 'merchant-menu-edit', params: { id: product.id } }"
            :class="
              cn(
                buttonVariants({ variant: 'outline' }),
                'size-11 gap-1.5 px-0 md:-mr-1.5 md:size-auto md:min-h-11 md:border-transparent md:px-3 md:shadow-none',
              )
            "
            ><Pencil class="size-4" aria-hidden="true" /><span class="sr-only md:not-sr-only"
              >แก้ไข</span
            ></RouterLink
          >
        </div>
      </li>
      <li class="hidden md:flex">
        <RouterLink
          :to="{ name: 'merchant-menu-new' }"
          class="flex min-h-72 w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <Plus class="size-6" aria-hidden="true" />
          <span class="text-body-sm font-medium">เพิ่มเมนูใหม่</span>
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
