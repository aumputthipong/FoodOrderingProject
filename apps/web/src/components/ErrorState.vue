<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/error-messages'

defineProps<{ error: unknown }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div role="alert" class="flex flex-col items-center gap-3 px-4 py-16 text-center">
    <p class="text-sm text-destructive">{{ errorMessage(error) }}</p>
    <Button variant="outline" @click="$emit('retry')">ลองใหม่</Button>
  </div>
</template>
