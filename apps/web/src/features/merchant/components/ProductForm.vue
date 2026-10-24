<script setup lang="ts">
import { productFieldsSchema, type ProductFields } from '@canteen/shared'
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
  initial?: { name: string; description: string; price: number; imageUrl: string | null }
  imageRequired: boolean
  submitting: boolean
  serverError?: unknown
  cancelTo?: RouteLocationRaw
}>()
const emit = defineEmits<{ submit: [value: { fields: ProductFields; image: File | null }] }>()

const image = ref<File | null>(null)
const imageError = ref<string | undefined>(undefined)
const formError = ref<string | null>(null)

const { handleSubmit, setFieldError } = useForm({
  validationSchema: toFormSchema(productFieldsSchema),
  initialValues: {
    name: props.initial?.name ?? '',
    description: props.initial?.description ?? '',
    price: props.initial?.price,
  },
})

watch(
  () => props.serverError,
  (error) => {
    if (!error) return
    formError.value = applyServerErrors(
      error,
      (field, message) => {
        if (field === 'image') imageError.value = message
        else setFieldError(field as keyof ProductFields, message)
      },
      ['name', 'description', 'price', 'image'],
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
    class="grid max-w-4xl gap-x-10 gap-y-6 rounded-card border border-border bg-card p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]"
    novalidate
    @submit="onSubmit"
  >
    <div class="grid content-start gap-4">
      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>ชื่อเมนู</FormLabel>
          <FormControl>
            <Input type="text" class="min-h-11" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="description">
        <FormItem>
          <FormLabel>รายละเอียด</FormLabel>
          <FormControl>
            <Textarea rows="5" class="min-h-32" v-bind="componentField" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="price">
        <FormItem>
          <FormLabel>ราคา (บาท)</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputmode="decimal"
              step="0.01"
              min="0.01"
              class="min-h-11 sm:max-w-48"
              v-bind="componentField"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <ImageUploadField
      v-model="image"
      label="รูปเมนู"
      ratio="1/1"
      preview-class="max-w-56 lg:max-w-none"
      :current-url="initial?.imageUrl"
      :error="imageError"
      @invalid="(message) => (imageError = message)"
    />
    <p v-if="formError" role="alert" class="text-sm text-destructive lg:col-span-2">
      {{ formError }}
    </p>
    <div class="flex flex-wrap gap-3 border-t border-border pt-5 lg:col-span-2">
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
