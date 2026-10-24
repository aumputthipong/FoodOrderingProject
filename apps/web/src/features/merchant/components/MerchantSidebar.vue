<script setup lang="ts">
import { Eye, LogOut } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import { isMerchantLinkActive, merchantLinks } from '../nav'

defineProps<{
  shopId: number | null
  shopName: string | null
  shopImageUrl: string | null
  ownerName: string
  waitingCount: number | null
}>()
defineEmits<{ logout: [] }>()

const route = useRoute()
</script>

<template>
  <aside
    data-testid="merchant-sidebar"
    class="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card lg:flex"
  >
    <div class="flex flex-col gap-1 px-5 pb-5 pt-6">
      <AppLogo />
      <span class="text-caption text-muted-foreground">สำหรับร้านค้า</span>
    </div>
    <div class="mx-3 flex items-center gap-3 rounded-card bg-background p-3">
      <ImageWithFallback
        :src="shopImageUrl"
        alt=""
        ratio="1/1"
        class="size-11 shrink-0 rounded-thumb"
      />
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-body-sm font-semibold">{{ shopName ?? 'ยังไม่มีร้าน' }}</span>
        <span class="truncate text-caption text-muted-foreground">ร้านของฉัน</span>
      </span>
    </div>
    <nav aria-label="เมนูร้าน" class="flex flex-col gap-1 px-3 pt-5">
      <RouterLink
        v-for="link in merchantLinks"
        :key="link.name"
        :to="{ name: link.name }"
        class="flex h-11 items-center gap-3 rounded-thumb px-3 transition-colors hover:bg-muted"
        :class="
          isMerchantLinkActive(link, route.name)
            ? 'bg-primary/10 font-semibold text-primary-hover hover:bg-primary/10'
            : 'text-muted-foreground hover:text-foreground'
        "
        :aria-current="isMerchantLinkActive(link, route.name) ? 'page' : undefined"
      >
        <component :is="link.icon" class="size-[18px] shrink-0" aria-hidden="true" />
        <span class="flex-1">{{ link.label }}</span>
        <span
          v-if="link.name === 'merchant-queue' && waitingCount"
          data-testid="waiting-count"
          class="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-caption font-semibold text-primary-foreground"
          ><span class="sr-only">รอทำ </span>{{ waitingCount }}</span
        >
      </RouterLink>
    </nav>
    <div v-if="shopId !== null" class="mx-3 mt-4 border-t border-border pt-4">
      <RouterLink
        :to="{ name: 'shop', params: { id: shopId } }"
        class="flex h-11 items-center gap-3 rounded-thumb px-3 text-body-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Eye class="size-[18px] shrink-0" aria-hidden="true" />ดูหน้าร้านของฉัน
      </RouterLink>
    </div>
    <div class="mt-auto flex items-center gap-2 border-t border-border py-3 pl-5 pr-3">
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-body-sm font-medium">{{ ownerName }}</span>
        <span class="text-caption text-muted-foreground">เจ้าของร้าน</span>
      </span>
      <button
        type="button"
        aria-label="ออกจากระบบ"
        title="ออกจากระบบ"
        class="flex size-11 shrink-0 items-center justify-center rounded-thumb text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        @click="$emit('logout')"
      >
        <LogOut class="size-[18px]" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>
