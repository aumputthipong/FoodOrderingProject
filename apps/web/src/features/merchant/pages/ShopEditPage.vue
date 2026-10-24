<script setup lang="ts">
import type { ShopFields } from '@canteen/shared'
import { ChevronLeft } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
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
  <div class="flex flex-col gap-4">
    <RouterLink
      :to="{ name: 'merchant-queue' }"
      class="-ml-2 flex min-h-11 w-fit items-center gap-1 px-2 text-sm font-medium text-primary hover:underline"
    >
      <ChevronLeft class="size-4" aria-hidden="true" />กลับ
    </RouterLink>
    <h1 class="font-heading text-display font-semibold">ข้อมูลร้าน</h1>
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
      :cancel-to="{ name: 'merchant-queue' }"
      @submit="onSubmit"
    />
  </div>
</template>
