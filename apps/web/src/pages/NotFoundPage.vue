<script setup lang="ts">
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
</script>

<template>
  <EmptyState title="ไม่พบหน้าที่ค้นหา" description="หน้านี้อาจถูกย้ายหรือไม่มีอยู่แล้ว">
    <template #action>
      <RouterLink :to="{ name: 'home' }" :class="cn(buttonVariants())">กลับหน้าแรก</RouterLink>
    </template>
  </EmptyState>
</template>
