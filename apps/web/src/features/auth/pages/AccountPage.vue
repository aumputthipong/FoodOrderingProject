<script setup lang="ts">
import type { Role } from '@canteen/shared'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatMobile } from '@/lib/format'
import { nameInitial } from '@/lib/initial'
import { useAuthStore } from '../index'

const ROLE_LABELS: Record<Role, string> = {
  customer: 'ลูกค้า',
  merchant: 'ร้านค้า',
  admin: 'ผู้ดูแลระบบ',
}

const auth = useAuthStore()
const router = useRouter()
const loggingOut = ref(false)

const initial = computed(() => nameInitial(auth.user?.firstName))

const rows = computed(() => {
  const user = auth.user
  if (!user) return []
  return [
    { label: 'ชื่อ', value: `${user.firstName} ${user.lastName}` },
    { label: 'ชื่อผู้ใช้', value: user.username },
    { label: 'อีเมล', value: user.email },
    { label: 'เบอร์มือถือ', value: formatMobile(user.mobile) },
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
  <div class="flex w-full flex-col gap-4 p-4 md:mx-auto md:max-w-3xl md:pt-8">
    <h1 class="page-title">บัญชีของฉัน</h1>
    <Card class="gap-4 rounded-card border-0 py-4 shadow-none">
      <CardContent class="grid gap-4">
        <div class="flex items-center gap-3">
          <span
            data-testid="account-initial"
            aria-hidden="true"
            class="flex size-14 flex-none items-center justify-center rounded-full bg-accent font-heading text-title font-semibold text-accent-foreground"
            >{{ initial }}</span
          >
          <span class="min-w-0 break-words text-body-sm font-semibold">{{ rows[0]?.value }}</span>
        </div>
        <dl class="grid gap-3">
          <div v-for="row in rows.slice(1)" :key="row.label" class="grid gap-0.5">
            <dt class="text-sm text-muted-foreground">{{ row.label }}</dt>
            <dd class="font-medium break-words">{{ row.value }}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
    <Button v-if="auth.isMerchant" @click="router.push({ name: 'merchant-queue' })">
      จัดการร้านของฉัน
    </Button>
    <Button
      variant="ghost"
      class="text-destructive hover:text-destructive"
      :disabled="loggingOut"
      @click="logout"
    >
      {{ loggingOut ? 'กำลังออกจากระบบ...' : 'ออกจากระบบ' }}
    </Button>
  </div>
</template>
