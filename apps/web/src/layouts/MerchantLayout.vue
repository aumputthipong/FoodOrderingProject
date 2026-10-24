<script setup lang="ts">
import { LogOut, Store } from '@lucide/vue'
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
        class="flex items-center border-b border-border bg-card px-1 lg:hidden"
      >
        <RouterLink
          v-for="link in merchantLinks"
          :key="link.name"
          :to="{ name: link.name }"
          class="-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-2.5 text-sm transition-colors hover:text-foreground"
          :class="
            isMerchantLinkActive(link, route.name)
              ? 'border-primary font-semibold text-primary-hover'
              : 'border-transparent text-muted-foreground'
          "
          :aria-current="isMerchantLinkActive(link, route.name) ? 'page' : undefined"
          >{{ link.label }}</RouterLink
        >
        <RouterLink
          :to="{ name: 'home' }"
          aria-label="ไปหน้าลูกค้า"
          class="ml-auto flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
        >
          <Store class="size-5" aria-hidden="true" />
        </RouterLink>
        <button
          type="button"
          aria-label="ออกจากระบบ"
          class="flex size-11 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          @click="logout"
        >
          <LogOut class="size-5" aria-hidden="true" />
        </button>
      </nav>
      <main class="min-w-0 flex-1 p-4 pb-12 lg:p-8"><slot /></main>
    </div>
  </div>
</template>
