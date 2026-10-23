<script setup lang="ts">
import { UtensilsCrossed } from '@lucide/vue'
import { ref, watch } from 'vue'

const props = defineProps<{ src: string | null; alt: string; ratio: '16/10' | '1/1' | '16/9' }>()

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <div class="w-full overflow-hidden bg-primary/10" :style="{ aspectRatio: ratio }">
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
