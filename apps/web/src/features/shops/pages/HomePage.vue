<script setup lang="ts">
import { Search, SearchX } from '@lucide/vue'
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
  <div>
    <div class="bg-card px-4 pb-3.5 pt-1 md:bg-transparent md:pt-6">
      <label class="sr-only" for="shop-search">ค้นหาร้าน</label>
      <div
        class="flex h-11 items-center gap-2.5 rounded-full bg-background px-3.5 text-muted-foreground focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring md:max-w-md md:bg-card"
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
    <div class="flex flex-col gap-4 p-4">
      <section
        v-if="!search"
        class="flex items-center justify-between gap-3 rounded-card bg-primary p-[18px] text-primary-foreground md:p-8"
      >
        <div class="flex flex-col gap-1">
          <span class="font-heading text-xl font-semibold md:text-3xl">สั่งก่อน รับก่อน</span>
          <span class="text-caption leading-normal md:text-body-sm"
            >สั่งจากโต๊ะ แล้วดูคิวได้ในแอป</span
          >
        </div>
        <span
          class="flex shrink-0 rotate-6 flex-col items-center gap-1 rounded-xl bg-accent px-3 py-2 font-heading text-accent-foreground"
          aria-hidden="true"
        >
          <span class="text-title font-bold leading-none">#12</span>
          <span class="w-full border-t-2 border-dashed border-accent-foreground/40" />
          <span class="h-1 w-8 rounded-full bg-accent-foreground/30" />
        </span>
      </section>
      <div class="flex items-baseline justify-between">
        <h1 class="page-title">ร้านในโรงอาหาร</h1>
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
      <EmptyState v-else-if="shops && shops.length === 0" title="ยังไม่มีร้านในโรงอาหาร" />
      <div v-else class="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4">
        <ShopCard v-for="shop in shops" :key="shop.id" :shop="shop" />
      </div>
    </div>
  </div>
</template>
