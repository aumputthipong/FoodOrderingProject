<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/features/auth'
import { useShopQuery } from '@/features/shops'
import { MerchantSidebar, isMerchantLinkActive, merchantLinks } from '@/features/merchant'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const { data: shop } = useShopQuery(() => auth.user?.shopId ?? null)

async function logout(): Promise<void> {
  await auth.logout()
  await router.replace({ name: 'home' })
}
</script>

<template>
  <div class="flex min-h-dvh bg-background">
    <MerchantSidebar
      :shop-name="shop?.name ?? null"
      :shop-image-url="shop?.imageUrl ?? null"
      :username="auth.user?.username ?? ''"
      @logout="logout"
    />
    <div class="flex min-w-0 flex-1 flex-col">
      <nav
        data-testid="merchant-tabs"
        aria-label="เมนูร้าน"
        class="flex items-center gap-1 overflow-x-auto border-b border-border bg-card px-2 lg:hidden"
      >
        <RouterLink
          v-for="link in merchantLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="flex min-h-11 shrink-0 items-center px-3 text-sm transition-colors"
          :class="
            isMerchantLinkActive(link, route.name)
              ? 'font-semibold text-primary'
              : 'text-muted-foreground'
          "
          :aria-current="isMerchantLinkActive(link, route.name) ? 'page' : undefined"
          >{{ link.label }}</RouterLink
        >
        <RouterLink
          :to="{ name: 'home' }"
          class="flex min-h-11 shrink-0 items-center px-3 text-sm text-muted-foreground transition-colors"
          >ไปหน้าลูกค้า</RouterLink
        >
        <button
          type="button"
          class="ml-auto flex min-h-11 shrink-0 items-center px-3 text-sm text-muted-foreground transition-colors"
          @click="logout"
        >
          ออกจากระบบ
        </button>
      </nav>
      <main class="min-w-0 flex-1 p-4 pb-12 lg:p-8"><slot /></main>
    </div>
  </div>
</template>
