<script setup lang="ts">
import { Search } from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import ShopCard from '../components/ShopCard.vue'
import { useShopsQuery } from '../queries'

const SEARCH_DEBOUNCE_MS = 300

const route = useRoute()
const router = useRouter()

function queryParam(): string {
  const q = route.query.q
  return (Array.isArray(q) ? q[0] : q) ?? ''
}

const input = ref(queryParam())
const search = computed(() => queryParam().trim())
const { data: shops, isPending, isError, error, refetch } = useShopsQuery(search)

let syncTimer: ReturnType<typeof setTimeout> | null = null

function cancelSync(): void {
  if (syncTimer !== null) clearTimeout(syncTimer)
  syncTimer = null
}

function syncUrl(value: string): void {
  cancelSync()
  syncTimer = setTimeout(() => {
    syncTimer = null
    const trimmed = value.trim()
    void router.replace({ query: { ...route.query, q: trimmed === '' ? undefined : trimmed } })
  }, SEARCH_DEBOUNCE_MS)
}

// a pending update must never stamp ?q= onto the page we are leaving for
onBeforeRouteLeave(cancelSync)
onBeforeUnmount(cancelSync)

function onInput(event: Event): void {
  input.value = (event.target as HTMLInputElement).value
  syncUrl(input.value)
}
</script>

<template>
  <div>
    <div class="bg-card px-4 pb-3.5 pt-1 md:bg-transparent md:pt-6">
      <label class="sr-only" for="shop-search">ค้นหาร้าน</label>
      <div
        class="flex h-11 items-center gap-2.5 rounded-full bg-background px-3.5 text-muted-foreground md:max-w-md md:bg-card"
      >
        <Search class="size-[18px] shrink-0" aria-hidden="true" />
        <input
          id="shop-search"
          type="search"
          name="q"
          placeholder="ค้นหาร้านอาหาร"
          autocomplete="off"
          :value="input"
          class="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          @input="onInput"
        />
      </div>
    </div>
    <div class="flex flex-col gap-4 p-4">
      <section
        class="flex items-center justify-between gap-3 rounded-2xl bg-primary p-[18px] text-primary-foreground"
      >
        <div class="flex flex-col gap-1">
          <span class="font-heading text-xl font-semibold">สั่งก่อน รับก่อน</span>
          <span class="text-[13px] leading-normal">สั่งจากโต๊ะ แล้วดูคิวได้ในแอป</span>
        </div>
        <span class="size-14 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      </section>
      <div class="flex items-baseline justify-between">
        <h1 class="font-heading text-lg font-semibold">ร้านในโรงอาหาร</h1>
        <span v-if="shops" class="text-[13px] text-muted-foreground">{{ shops.length }} ร้าน</span>
      </div>
      <div v-if="isPending" class="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4">
        <Skeleton v-for="n in 4" :key="n" class="h-24 rounded-[14px] md:h-56" />
      </div>
      <ErrorState v-else-if="isError" :error="error" @retry="refetch()" />
      <EmptyState
        v-else-if="shops && shops.length === 0"
        :title="search ? 'ไม่พบร้านที่ค้นหา' : 'ยังไม่มีร้านในโรงอาหาร'"
      />
      <div v-else class="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4">
        <ShopCard v-for="shop in shops" :key="shop.id" :shop="shop" />
      </div>
    </div>
  </div>
</template>
