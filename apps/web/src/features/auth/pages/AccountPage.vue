<script setup lang="ts">
import type { Role } from '@canteen/shared'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '../index'

const ROLE_LABELS: Record<Role, string> = {
  customer: 'ลูกค้า',
  merchant: 'ร้านค้า',
  admin: 'ผู้ดูแลระบบ',
}

const auth = useAuthStore()
const router = useRouter()
const loggingOut = ref(false)

const rows = computed(() => {
  const user = auth.user
  if (!user) return []
  return [
    { label: 'ชื่อ', value: `${user.firstName} ${user.lastName}` },
    { label: 'ชื่อผู้ใช้', value: user.username },
    { label: 'อีเมล', value: user.email },
    { label: 'เบอร์มือถือ', value: user.mobile },
    { label: 'ประเภทบัญชี', value: ROLE_LABELS[user.role] },
  ]
})

async function logout(): Promise<void> {
  loggingOut.value = true
  try {
    await auth.logout()
    await router.replace({ name: 'home' })
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="mx-auto grid w-full max-w-md gap-4">
    <Card>
      <CardHeader>
        <CardTitle class="font-heading text-xl">บัญชีของฉัน</CardTitle>
      </CardHeader>
      <CardContent>
        <dl class="grid gap-3">
          <div v-for="row in rows" :key="row.label" class="grid gap-0.5">
            <dt class="text-sm text-muted-foreground">{{ row.label }}</dt>
            <dd class="font-medium break-words">{{ row.value }}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    <Button v-if="auth.isMerchant" @click="router.push({ name: 'merchant-queue' })">
      จัดการร้านของฉัน
    </Button>
    <Button variant="outline" :disabled="loggingOut" @click="logout">
      {{ loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ' }}
    </Button>
  </div>
</template>
