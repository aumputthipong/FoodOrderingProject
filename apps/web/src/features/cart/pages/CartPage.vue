<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import EmptyState from '@/components/EmptyState.vue'
import ErrorState from '@/components/ErrorState.vue'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCheckoutMutation } from '@/features/orders'
import { useCartsQuery, useRemoveCartItemMutation, useUpdateCartItemMutation } from '../queries'
import CartGroup from '../components/CartGroup.vue'

const router = useRouter()
const { data: carts, isPending, error, refetch } = useCartsQuery()
const update = useUpdateCartItemMutation()
const remove = useRemoveCartItemMutation()
const checkout = useCheckoutMutation()

// Any pending cart mutation locks every group, so two quick taps never send the same absolute quantity.
const busy = computed(
  () => update.isPending.value || remove.isPending.value || checkout.isPending.value,
)

function onCheckout(cartId: number): void {
  checkout.mutate(cartId, {
    onSuccess: () => {
      toast.success('สั่งอาหารแล้ว')
      void router.push({ name: 'orders' })
    },
  })
}
</script>

<template>
  <div class="flex flex-col gap-3.5 p-4">
    <header class="flex items-baseline justify-between">
      <h1 class="font-heading text-xl font-semibold">ตะกร้า</h1>
      <span v-if="carts?.length" class="text-[13px] text-muted-foreground"
        >{{ carts.length }} ร้าน · แยกสั่งทีละร้าน</span
      >
    </header>
    <ErrorState v-if="error && !carts" :error="error" @retry="refetch()" />
    <template v-else-if="isPending || !carts">
      <Skeleton class="h-48 w-full rounded-2xl" />
      <Skeleton class="h-48 w-full rounded-2xl" />
    </template>
    <EmptyState v-else-if="carts.length === 0" title="ตะกร้ายังว่าง">
      <template #action>
        <Button as-child>
          <RouterLink :to="{ name: 'home' }">ไปเลือกร้าน</RouterLink>
        </Button>
      </template>
    </EmptyState>
    <div v-else class="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
      <CartGroup
        v-for="cart in carts"
        :key="cart.id"
        :cart="cart"
        :busy="busy"
        @change-quantity="(id, quantity) => update.mutate({ id, quantity })"
        @remove="(id) => remove.mutate(id)"
        @checkout="onCheckout"
      />
    </div>
  </div>
</template>
