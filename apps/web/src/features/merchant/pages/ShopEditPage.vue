<script setup lang="ts">
import type { ShopFields } from '@canteen/shared'
import { ref } from 'vue'
import { toast } from 'vue-sonner'
import ErrorState from '@/components/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth'
import { useShopQuery } from '@/features/shops'
import { toFormData } from '@/lib/form-data'
import ShopForm from '../components/ShopForm.vue'
import { useUpdateShopMutation } from '../queries'

const auth = useAuthStore()
const { data: shop, error, refetch } = useShopQuery(() => auth.user?.shopId ?? null)
const update = useUpdateShopMutation()
const serverError = ref<unknown>(null)

async function onSubmit({ fields, image }: { fields: ShopFields; image: File | null }) {
  if (!shop.value) return
  serverError.value = null
  try {
    await update.mutateAsync({ id: shop.value.id, form: toFormData(fields, image) })
  } catch (e) {
    serverError.value = e
    return
  }
  toast.success('บันทึกแล้ว')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="font-heading text-[26px] font-semibold">ข้อมูลร้าน</h1>
    <ErrorState v-if="error && !shop" :error="error" @retry="refetch()" />
    <div v-else-if="!shop" class="flex max-w-xl flex-col gap-4">
      <Skeleton class="h-11 w-full" />
      <Skeleton class="h-28 w-full" />
      <Skeleton class="aspect-video w-full max-w-sm" />
    </div>
    <ShopForm
      v-else
      :initial="{ name: shop.name, description: shop.description, imageUrl: shop.imageUrl }"
      :image-required="false"
      :submitting="update.isPending.value"
      :server-error="serverError"
      @submit="onSubmit"
    />
  </div>
</template>
