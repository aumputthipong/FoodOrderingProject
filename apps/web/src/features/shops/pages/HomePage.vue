<script setup lang="ts">
import { Search, SearchX, Store } from '@lucide/vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { Button } from '@/components/ui/button'
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
const { data: shops, isPending, isPlaceholderData, isError, error, refetch } = useShopsQuery(search)

let syncTimer: ReturnType<typeof setTimeout> | null = null
// the term this page last wrote to the URL, until that navigation settles
let lastWritten: string | null = null

function cancelSync(): void {
  if (syncTimer !== null) clearTimeout(syncTimer)
  syncTimer = null
}

function writeUrl(trimmed: string): void {
  lastWritten = trimmed
  void router
    .replace({ query: { ...route.query, q: trimmed === '' ? undefined : trimmed } })
    .finally(async () => {
      // let the route watcher see the echo first; no-op/cancelled navigations settle too
      await nextTick()
      if (lastWritten === trimmed) lastWritten = null
    })
}

function syncUrl(value: string): void {
  cancelSync()
  syncTimer = setTimeout(() => {
    syncTimer = null
    writeUrl(value.trim())
  }, SEARCH_DEBOUNCE_MS)
}

// back/forward: show the URL's term in the box, without writing it back
watch(
  () => queryParam().trim(),
  (q) => {
    if (q === lastWritten || q === input.value.trim()) return
    cancelSync()
    input.value = q
  },
)

// a pending update must never stamp ?q= onto the page we are leaving for
onBeforeRouteLeave(cancelSync)
onBeforeUnmount(cancelSync)

function onInput(event: Event): void {
  input.value = (event.target as HTMLInputElement).value
  syncUrl(input.value)
}

function clearSearch(): void {
  cancelSync()
  input.value = ''
  writeUrl('')
}
</script>

<template>
  <div class="flex flex-col gap-4 p-4 md:gap-6 md:pt-6">
    <section
      aria-labelledby="home-hero-title"
      class="relative overflow-hidden rounded-card bg-primary px-[18px] pb-[18px] pt-5 text-primary-foreground md:px-10 md:pb-9 md:pt-10"
    >
      <div class="relative flex max-w-xl flex-col gap-1">
        <p id="home-hero-title" class="font-heading text-xl font-semibold md:text-3xl">
          สั่งก่อน รับก่อน
        </p>
        <p class="text-caption leading-normal md:text-body-sm">สั่งจากโต๊ะ แล้วดูคิวได้ในแอป</p>
        <label class="sr-only" for="shop-search">ค้นหาร้าน</label>
        <div
          class="mt-3.5 flex h-12 items-center gap-2.5 rounded-full bg-card px-4 text-muted-foreground shadow-sm focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-card md:mt-6"
        >
          <Search class="size-[18px] shrink-0" aria-hidden="true" />
          <input
            id="shop-search"
            type="search"
            name="q"
            placeholder="ค้นหาร้านอาหาร"
            autocomplete="off"
            :value="input"
            class="min-w-0 flex-1 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
            @input="onInput"
          />
        </div>
      </div>
      <span
        class="absolute right-10 top-1/2 hidden -translate-y-1/2 rotate-6 flex-col items-center gap-1.5 rounded-2xl bg-accent px-5 py-3.5 font-heading text-accent-foreground md:flex"
        aria-hidden="true"
      >
        <span class="text-[40px] font-bold leading-none">#12</span>
        <span class="w-full border-t-2 border-dashed border-accent-foreground/40" />
        <span class="h-1.5 w-12 rounded-full bg-accent-foreground/30" />
      </span>
    </section>
    <div class="flex flex-col gap-4">
      <div class="flex items-baseline justify-between">
        <h1 class="page-title">{{ search ? `ผลการค้นหา “${search}”` : 'ร้านในโรงอาหาร' }}</h1>
        <span v-if="shops" class="text-caption text-muted-foreground">{{ shops.length }} ร้าน</span>
      </div>
      <div
        v-if="isPending || (isPlaceholderData && !shops?.length)"
        class="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4"
      >
        <div
          v-for="n in 4"
          :key="n"
          data-testid="shop-skeleton"
          class="flex gap-3 rounded-card bg-card p-2.5 md:flex-col md:gap-0 md:overflow-hidden md:p-0"
        >
          <Skeleton
            class="aspect-square w-[76px] shrink-0 rounded-thumb md:aspect-[16/10] md:w-full md:rounded-none"
          />
          <div class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 md:p-3.5">
            <Skeleton class="h-5 w-2/3" />
            <Skeleton class="h-4 w-full" />
          </div>
        </div>
      </div>
      <ErrorState v-else-if="isError" :error="error" @retry="refetch()" />
      <EmptyState
        v-else-if="shops && shops.length === 0 && search"
        :icon="SearchX"
        title="ไม่พบร้านที่ค้นหา"
        description="ลองค้นด้วยชื่อร้านอื่น"
      >
        <template #action>
          <Button variant="outline" @click="clearSearch">ล้างคำค้นหา</Button>
        </template>
      </EmptyState>
      <EmptyState
        v-else-if="shops && shops.length === 0"
        :icon="Store"
        title="ยังไม่มีร้านในโรงอาหาร"
      />
      <div v-else class="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4">
        <ShopCard v-for="shop in shops" :key="shop.id" :shop="shop" />
      </div>
    </div>
  </div>
</template>
