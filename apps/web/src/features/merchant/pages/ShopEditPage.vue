<script setup lang="ts">
import type { ShopFields } from '@canteen/shared'
import { Eye } from '@lucide/vue'
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { toast } from 'vue-sonner'
import ErrorState from '@/components/ErrorState.vue'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth'
import { useShopQuery } from '@/features/shops'
import { toFormData } from '@/lib/form-data'
import { cn } from '@/lib/utils'
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
    <div class="flex max-w-4xl flex-wrap items-end justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1 class="page-title-lg">ข้อมูลร้าน</h1>
        <p class="text-muted-foreground">ชื่อ คำอธิบาย และรูปนี้คือสิ่งที่ลูกค้าเห็นในหน้าแรก</p>
      </div>
      <RouterLink
        v-if="shop"
        :to="{ name: 'shop', params: { id: shop.id } }"
        :class="cn(buttonVariants({ variant: 'outline' }), 'min-h-11 gap-1.5')"
        ><Eye class="size-4" aria-hidden="true" />ดูหน้าร้านของฉัน</RouterLink
      >
    </div>
    <ErrorState v-if="error && !shop" :error="error" @retry="refetch()" />
    <Skeleton v-else-if="!shop" class="h-96 w-full max-w-4xl rounded-card" />
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
