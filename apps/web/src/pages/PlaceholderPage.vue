<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <h1 class="font-heading px-4 py-6 text-xl font-semibold">{{ route.meta.title }}</h1>
</template>
