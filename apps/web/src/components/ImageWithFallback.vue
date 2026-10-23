<script setup lang="ts">
import { UtensilsCrossed } from '@lucide/vue'
import { ref, watch } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  src: string | null
  alt: string
  ratio: '16/10' | '1/1' | '16/9'
  class?: string
}>()

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <div
    :class="cn('w-full overflow-hidden bg-primary/10', props.class)"
    :style="{ aspectRatio: ratio }"
  >
    <img
      v-if="src && !failed"
      :src="src"
      :alt="alt"
      loading="lazy"
      class="size-full object-cover"
      @error="failed = true"
    />
    <div
      v-else
      data-testid="image-fallback"
      class="flex size-full items-center justify-center bg-primary/10 text-primary"
    >
      <UtensilsCrossed class="size-6" aria-hidden="true" />
    </div>
  </div>
</template>
