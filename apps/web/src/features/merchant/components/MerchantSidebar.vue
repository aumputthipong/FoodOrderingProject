<script setup lang="ts">
import { Store } from '@lucide/vue'
import { RouterLink, useRoute } from 'vue-router'
import AppLogo from '@/components/AppLogo.vue'
import ImageWithFallback from '@/components/ImageWithFallback.vue'
import { Button } from '@/components/ui/button'
import { isMerchantLinkActive, merchantLinks } from '../nav'

defineProps<{ shopName: string | null; shopImageUrl: string | null; username: string }>()
defineEmits<{ logout: [] }>()

const route = useRoute()
</script>

<template>
  <aside
    data-testid="merchant-sidebar"
    class="hidden w-56 shrink-0 flex-col gap-6 border-r border-border bg-card px-4 py-5 lg:flex"
  >
    <div class="flex flex-col gap-1">
      <AppLogo />
      <span class="text-sm text-muted-foreground">สำหรับร้านค้า</span>
    </div>
    <div class="flex items-center gap-2.5 rounded-xl bg-background p-2.5">
      <ImageWithFallback
        :src="shopImageUrl"
        alt=""
        ratio="1/1"
        class="size-10 shrink-0 rounded-thumb"
      />
      <span class="flex min-w-0 flex-col">
        <span class="truncate text-sm font-semibold">{{ shopName ?? 'ยังไม่มีร้าน' }}</span>
        <span class="truncate text-caption text-muted-foreground">{{ username }}</span>
      </span>
    </div>
    <nav aria-label="เมนูร้าน" class="flex flex-col gap-1">
      <RouterLink
        v-for="link in merchantLinks"
        :key="link.name"
        :to="{ name: link.name }"
        class="flex h-11 items-center rounded-thumb px-3 transition-colors hover:text-foreground"
        :class="
          isMerchantLinkActive(link, route.name)
            ? 'bg-primary/10 font-semibold text-primary-hover hover:text-primary-hover'
            : 'text-muted-foreground'
        "
        :aria-current="isMerchantLinkActive(link, route.name) ? 'page' : undefined"
        >{{ link.label }}</RouterLink
      >
      <RouterLink
        :to="{ name: 'home' }"
        class="mt-2 flex h-11 items-center gap-2 rounded-thumb px-3 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Store class="size-4" aria-hidden="true" />ไปหน้าลูกค้า
      </RouterLink>
    </nav>
    <Button variant="outline" class="mt-auto" @click="$emit('logout')">ออกจากระบบ</Button>
  </aside>
</template>
