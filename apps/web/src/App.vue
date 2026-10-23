<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import AuthLayout from '@/layouts/AuthLayout.vue'
import CustomerLayout from '@/layouts/CustomerLayout.vue'
import MerchantLayout from '@/layouts/MerchantLayout.vue'

const layouts = { customer: CustomerLayout, merchant: MerchantLayout, auth: AuthLayout }

const route = useRoute()
const layout = computed(() => layouts[route.meta.layout ?? 'customer'])
</script>

<template>
  <component :is="layout">
    <RouterView v-slot="{ Component, route: viewRoute }">
      <component :is="Component" :key="viewRoute.path" />
    </RouterView>
  </component>
  <Toaster rich-colors position="top-center" />
</template>
