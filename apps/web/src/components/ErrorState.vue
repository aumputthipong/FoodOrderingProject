<script setup lang="ts">
import { CircleAlert } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/error-messages'

defineProps<{ error: unknown }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" class="flex flex-col items-center gap-3 px-4 py-16 text-center">
    <div class="flex items-center gap-2 text-destructive">
      <CircleAlert class="size-5 flex-none" aria-hidden="true" />
      <p class="text-body-sm">{{ errorMessage(error) }}</p>
    </div>
    <Button variant="outline" @click="$emit('retry')">ลองใหม่</Button>
  </div>
</template>
