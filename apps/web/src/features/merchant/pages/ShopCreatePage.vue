<script setup lang="ts">
import type { ShopFields } from '@canteen/shared'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { toFormData } from '@/lib/form-data'
import ShopForm from '../components/ShopForm.vue'
import { useCreateShopMutation } from '../queries'

const router = useRouter()
const create = useCreateShopMutation()
const serverError = ref<unknown>(null)

async function onSubmit({ fields, image }: { fields: ShopFields; image: File | null }) {
  serverError.value = null
  try {
    await create.mutateAsync(toFormData(fields, image))
  } catch (error) {
    serverError.value = error
    return
  }
  toast.success('สร้างร้านแล้ว')
  await router.replace({ name: 'merchant-queue' })
}
</script>

<template>
  <div class="flex flex-col gap-6 p-4 lg:p-8">
    <h1 class="font-heading text-[26px] font-semibold">สร้างร้านของคุณ</h1>
    <ShopForm
      image-required
      :submitting="create.isPending.value"
      :server-error="serverError"
      @submit="onSubmit"
    />
  </div>
</template>
