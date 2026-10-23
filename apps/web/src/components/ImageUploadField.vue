<script lang="ts">
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]

const DEFAULT_MAX_MB = 5

function defaultMaxMb(): number {
  const configured = Number(import.meta.env.VITE_UPLOAD_MAX_MB)
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_MB
}
</script>

<script setup lang="ts">
import { ImagePlus } from '@lucide/vue'
import { computed, onBeforeUnmount, ref, useId, watch } from 'vue'
import { Button } from '@/components/ui/button'

const props = withDefaults(
  defineProps<{
    modelValue: File | null
    currentUrl?: string | null
    label: string
    error?: string
    maxMb?: number
    ratio?: '16/10' | '1/1' | '16/9'
  }>(),
  {
    currentUrl: null,
    error: undefined,
    ratio: '16/9',
    maxMb: defaultMaxMb(),
  },
)
const emit = defineEmits<{
  'update:modelValue': [file: File | null]
  invalid: [message: string]
}>()

const inputId = useId()
const input = ref<HTMLInputElement | null>(null)
const localError = ref<string | null>(null)
const objectUrl = ref<string | null>(null)

watch(
  () => props.modelValue,
  (file) => {
    if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = file ? URL.createObjectURL(file) : null
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

const previewSrc = computed(() => objectUrl.value ?? props.currentUrl)
const shownError = computed(() => localError.value ?? props.error)

function reject(message: string) {
  localError.value = message
  emit('invalid', message)
}

function onChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    reject('รองรับเฉพาะไฟล์ JPEG, PNG, WebP, AVIF หรือ GIF')
    return
  }
  if (file.size > props.maxMb * 1024 * 1024) {
    reject(`ไฟล์ต้องมีขนาดไม่เกิน ${props.maxMb} MB`)
    return
  }
  localError.value = null
  emit('update:modelValue', file)
}
</script>

<template>
  <div class="space-y-2">
    <label :for="inputId" class="text-sm font-medium text-foreground">{{ label }}</label>
    <div
      :style="{ aspectRatio: ratio }"
      class="flex w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-primary/10"
    >
      <img v-if="previewSrc" :src="previewSrc" alt="" class="size-full object-cover" />
      <ImagePlus v-else class="size-8 text-primary" aria-hidden="true" />
    </div>
    <input
      :id="inputId"
      ref="input"
      type="file"
      class="sr-only"
      :accept="ACCEPTED_IMAGE_TYPES.join(',')"
      @change="onChange"
    />
    <Button type="button" variant="outline" @click="input?.click()">
      {{ previewSrc ? 'เปลี่ยนรูป' : 'เลือกรูป' }}
    </Button>
    <p v-if="shownError" role="alert" class="text-sm text-destructive">{{ shownError }}</p>
  </div>
</template>
