<script setup lang="ts">
import type { ProductFields } from '@canteen/shared'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import ErrorState from '@/components/ErrorState.vue'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/features/auth'
import { useShopQuery } from '@/features/shops'
import { toFormData } from '@/lib/form-data'
import NotFoundPage from '@/pages/NotFoundPage.vue'
import ProductForm from '../components/ProductForm.vue'
import { useSaveProductMutation } from '../queries'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const { data: shop, error, refetch } = useShopQuery(() => auth.user?.shopId ?? null)
const save = useSaveProductMutation()
const serverError = ref<unknown>(null)

const isNew = computed(() => route.name === 'merchant-menu-new')
const product = computed(() => {
  if (isNew.value) return undefined
  const id = Number(route.params.id)
  return shop.value?.products.find((p) => p.id === id)
})
const notFound = computed(() => !isNew.value && !!shop.value && !product.value)

async function onSubmit({ fields, image }: { fields: ProductFields; image: File | null }) {
  if (!shop.value) return
  serverError.value = null
  try {
    await save.mutateAsync({
      shopId: shop.value.id,
      productId: product.value?.id,
      form: toFormData(fields, image),
    })
  } catch (e) {
    serverError.value = e
    return
  }
  toast.success(isNew.value ? 'เพิ่มเมนูแล้ว เปิดขายได้ที่หน้าเมนู' : 'บันทึกแล้ว')
  await router.replace({ name: 'merchant-menu' })
}
</script>

<template>
  <NotFoundPage v-if="notFound" />
  <div v-else class="flex flex-col gap-6">
    <h1 class="font-heading text-[26px] font-semibold">{{ isNew ? 'เพิ่มเมนู' : 'แก้ไขเมนู' }}</h1>
    <ErrorState v-if="error && !shop" :error="error" @retry="refetch()" />
    <div v-else-if="!shop" class="flex max-w-xl flex-col gap-4">
      <Skeleton class="h-11 w-full" />
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-11 w-full" />
    </div>
    <ProductForm
      v-else
      :initial="
        product && {
          name: product.name,
          description: product.description,
          price: product.price,
          imageUrl: product.imageUrl,
        }
      "
      :image-required="isNew"
      :submitting="save.isPending.value"
      :server-error="serverError"
      @submit="onSubmit"
    />
  </div>
</template>
