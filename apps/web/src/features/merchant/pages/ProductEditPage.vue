<script setup lang="ts">
import type { ProductFields } from '@canteen/shared'
import { computed, ref } from 'vue'
import { ChevronLeft } from '@lucide/vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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
    <div class="flex flex-col gap-1">
      <nav aria-label="breadcrumb" class="text-sm">
        <ol class="flex items-center gap-1 text-muted-foreground">
          <li>
            <RouterLink
              :to="{ name: 'merchant-menu' }"
              class="-ml-2 flex min-h-11 items-center gap-1 px-2 font-medium text-primary hover:underline"
              ><ChevronLeft class="size-4" aria-hidden="true" />เมนูในร้าน</RouterLink
            >
          </li>
        </ol>
      </nav>
      <h1 class="page-title-lg">{{ isNew ? 'เพิ่มเมนู' : 'แก้ไขเมนู' }}</h1>
    </div>
    <ErrorState v-if="error && !shop" :error="error" @retry="refetch()" />
    <Skeleton v-else-if="!shop" class="h-96 w-full max-w-4xl rounded-card" />
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
      :cancel-to="{ name: 'merchant-menu' }"
      @submit="onSubmit"
    />
  </div>
</template>
