<script setup lang="ts">
import { ChevronLeft, ShoppingCart } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import PriceTag from '@/components/PriceTag.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth'
import { useShopCartDraft } from '@/features/cart'
import { isApiError } from '@/lib/api-error'
import NotFoundPage from '@/pages/NotFoundPage.vue'
import MenuItemCard from '../components/MenuItemCard.vue'
import { useShopQuery } from '../queries'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const shopId = computed(() => {
  const id = String(route.params.id)
  return /^[1-9]\d*$/.test(id) ? Number(id) : null
})
const { data: shop, isPending, error, refetch } = useShopQuery(shopId)

const { quantities, setQuantity, itemCount, ready } = useShopCartDraft(() => shopId.value ?? 0)

function onChange(productId: number, quantity: number): void {
  if (!auth.isLoggedIn) {
    void router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  setQuantity(productId, quantity)
}

const total = computed(() =>
  (shop.value?.products ?? []).reduce(
    (sum, product) => sum + (quantities.value[product.id] ?? 0) * product.price,
    0,
  ),
)

const notFound = computed(
  () => shopId.value === null || (isApiError(error.value) && error.value.status === 404),
)
</script>

<template>
  <NotFoundPage v-if="notFound" />
  <ErrorState v-else-if="error" :error="error" @retry="refetch()" />
  <div v-else-if="isPending || !shop" class="flex flex-col gap-3 p-4">
    <Skeleton class="aspect-video w-full rounded-2xl" />
    <Skeleton class="h-7 w-2/3" />
    <Skeleton class="h-20 w-full rounded-[14px]" />
    <Skeleton class="h-20 w-full rounded-[14px]" />
  </div>
  <div v-else>
    <div class="relative">
      <ImageWithFallback :src="shop.imageUrl" :alt="shop.name" ratio="16/9" />
      <RouterLink
        :to="{ name: 'home' }"
        aria-label="กลับ"
        class="absolute left-3.5 top-3.5 flex size-11 items-center justify-center rounded-full bg-card text-foreground shadow"
      >
        <ChevronLeft class="size-5" aria-hidden="true" />
      </RouterLink>
    </div>
    <section class="relative -mt-6 flex flex-col gap-1.5 rounded-t-[20px] bg-card px-4 pb-4 pt-5">
      <h1 class="font-heading text-[22px] font-semibold">{{ shop.name }}</h1>
      <p class="text-sm leading-normal text-muted-foreground">{{ shop.description }}</p>
    </section>
    <div class="flex flex-col gap-2.5 px-4 pb-40 pt-3 md:pb-24">
      <h2 class="mt-1 font-heading text-base font-semibold">เมนู</h2>
      <EmptyState v-if="shop.products.length === 0" title="ร้านนี้ยังไม่มีเมนู" />
      <div v-else class="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        <MenuItemCard
          v-for="product in shop.products"
          :key="product.id"
          :product="product"
          :quantity="quantities[product.id] ?? 0"
          :disabled="auth.isLoggedIn && !ready"
          @change="onChange(product.id, $event)"
        />
      </div>
    </div>
    <RouterLink
      v-if="itemCount > 0"
      data-testid="cart-bar"
      :to="{ name: 'cart' }"
      class="fixed inset-x-4 bottom-20 z-30 mx-auto flex min-h-14 max-w-5xl items-center justify-between rounded-2xl bg-primary px-4 text-primary-foreground shadow-lg md:bottom-6"
    >
      <span class="flex items-center gap-2.5 font-semibold">
        <span class="relative">
          <ShoppingCart class="size-5" aria-hidden="true" />
          <span
            class="absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground"
            >{{ itemCount }}</span
          >
        </span>
        ดูตะกร้า
      </span>
      <PriceTag :value="total" />
    </RouterLink>
  </div>
</template>
