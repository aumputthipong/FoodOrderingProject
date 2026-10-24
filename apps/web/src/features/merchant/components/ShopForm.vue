<script setup lang="ts">
import { shopFieldsSchema, type ShopFields } from '@canteen/shared'
import { useForm } from 'vee-validate'
import { ref, watch } from 'vue'
import ImageUploadField from '@/components/ImageUploadField.vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { Button, buttonVariants } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors } from '@/lib/form-errors'
import { toFormSchema } from '@/lib/form-schema'
import { cn } from '@/lib/utils'

const props = defineProps<{
  initial?: { name: string; description: string; imageUrl: string | null }
  imageRequired: boolean
  submitting: boolean
  serverError?: unknown
  cancelTo?: RouteLocationRaw
}>()
const emit = defineEmits<{ submit: [value: { fields: ShopFields; image: File | null }] }>()

const image = ref<File | null>(null)
const imageError = ref<string | undefined>(undefined)
const formError = ref<string | null>(null)

const { handleSubmit, setFieldError } = useForm({
  validationSchema: toFormSchema(shopFieldsSchema),
  initialValues: { name: props.initial?.name ?? '', description: props.initial?.description ?? '' },
})

watch(
  () => props.serverError,
  (error) => {
    if (!error) return
    formError.value = applyServerErrors(
      error,
      (field, message) => {
        if (field === 'image') imageError.value = message
        else setFieldError(field as keyof ShopFields, message)
      },
      ['name', 'description', 'image'],
    )
  },
)

watch(image, () => {
  imageError.value = undefined
})

const onSubmit = handleSubmit((fields) => {
  formError.value = null
  if (props.imageRequired && !image.value) {
    imageError.value = 'กรุณาเลือกรูป'
    return
  }
  emit('submit', { fields, image: image.value })
})
</script>

<template>
  <form
    class="grid max-w-xl gap-4 rounded-card border border-border bg-card p-6"
    novalidate
    @submit="onSubmit"
  >
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>ชื่อร้าน</FormLabel>
        <FormControl>
          <Input type="text" class="min-h-11" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="description">
      <FormItem>
        <FormLabel>คำอธิบายร้าน</FormLabel>
        <FormControl>
          <Textarea rows="4" v-bind="componentField" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <ImageUploadField
      v-model="image"
      label="รูปร้าน"
      ratio="16/9"
      :current-url="initial?.imageUrl"
      :error="imageError"
      @invalid="(message) => (imageError = message)"
    />
    <p v-if="formError" role="alert" class="text-sm text-destructive">{{ formError }}</p>
    <div class="flex flex-wrap gap-3">
      <Button type="submit" class="min-h-11" :disabled="submitting">
        {{ submitting ? 'กำลังบันทึก...' : 'บันทึก' }}
      </Button>
      <RouterLink
        v-if="cancelTo"
        :to="cancelTo"
        :class="cn(buttonVariants({ variant: 'outline' }), 'min-h-11')"
        >ยกเลิก</RouterLink
      >
    </div>
  </form>
</template>
