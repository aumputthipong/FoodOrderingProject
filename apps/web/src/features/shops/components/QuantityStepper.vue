<script setup lang="ts">
import { Minus, Plus } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    modelValue: number
    min?: number
    max?: number
    label: string
    disabled?: boolean
  }>(),
  { min: 0, max: 99 },
)
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

function change(delta: number): void {
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, props.modelValue + delta)))
}

const buttonClass = 'flex size-11 items-center justify-center rounded-full disabled:opacity-50'
</script>

<template>
  <div class="flex items-center gap-1">
    <template v-if="modelValue > 0">
      <button
        type="button"
        :disabled="disabled"
        :aria-label="`ลดจำนวน ${label}`"
        :class="`${buttonClass} border border-border bg-card text-foreground`"
        @click="change(-1)"
      >
        <Minus class="size-4" aria-hidden="true" />
      </button>
      <span class="min-w-6 text-center text-[15px] font-semibold tabular-nums">{{
        modelValue
      }}</span>
    </template>
    <button
      type="button"
      :disabled="disabled"
      :aria-label="`เพิ่มจำนวน ${label}`"
      :class="`${buttonClass} bg-primary text-primary-foreground`"
      @click="change(1)"
    >
      <Plus class="size-5" aria-hidden="true" />
    </button>
  </div>
</template>
