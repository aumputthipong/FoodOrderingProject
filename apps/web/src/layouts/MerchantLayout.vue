<script setup lang="ts">
import { Eye, LogOut } from '@lucide/vue'
import { computed } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth'
import { useShopQuery } from '@/features/shops'
import {
  MerchantSidebar,
  isMerchantLinkActive,
  merchantLinks,
  useShopOrdersQuery,
} from '@/features/merchant'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const shopId = computed(() => auth.user?.shopId ?? null)
const { data: shop } = useShopQuery(() => shopId.value)
// shares the queue page's cache and polling, so the count stays current on every merchant page
const { data: orders } = useShopOrdersQuery(() => shopId.value !== null)
const waitingCount = computed(() => orders.value?.waiting.length ?? null)
const ownerName = computed(() => (auth.user ? `${auth.user.firstName} ${auth.user.lastName}` : ''))

async function logout(): Promise<void> {
  await auth.logout()
  await router.replace({ name: 'home' })
}
</script>

<template>
  <div class="flex min-h-dvh bg-background">
    <MerchantSidebar
      :shop-id="shopId"
      :shop-name="shop?.name ?? null"
      :shop-image-url="shop?.imageUrl ?? null"
      :owner-name="ownerName"
      :waiting-count="waitingCount"
      @logout="logout"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <nav
        data-testid="merchant-tabs"
        aria-label="เมนูร้าน"
        class="sticky top-0 z-10 flex items-center border-b border-border bg-card px-1 lg:hidden"
      >
        <RouterLink
          v-for="link in merchantLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="-mb-px flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm transition-colors hover:text-foreground"
          :class="
            isMerchantLinkActive(link, route.name)
              ? 'border-primary font-semibold text-primary-hover'
              : 'border-transparent text-muted-foreground'
          "
          :aria-current="isMerchantLinkActive(link, route.name) ? 'page' : undefined"
          >{{ link.label
          }}<span
            v-if="link.name === 'merchant-queue' && waitingCount"
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground"
            ><span class="sr-only">รอทำ </span>{{ waitingCount }}</span
          ></RouterLink
        >
        <RouterLink
          v-if="shopId !== null"
          :to="{ name: 'shop', params: { id: shopId } }"
          aria-label="ดูหน้าร้านของฉัน"
          class="ml-auto flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <Eye class="size-5" aria-hidden="true" />
        </RouterLink>
        <button
          type="button"
          aria-label="ออกจากระบบ"
          class="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          :class="shopId === null ? 'ml-auto' : undefined"
          @click="logout"
        >
          <LogOut class="size-5" aria-hidden="true" />
        </button>
      </nav>
      <main class="w-full min-w-0 flex-1 p-4 pb-12 lg:px-10 lg:py-8"><slot /></main>
    </div>
  </div>
</template>
