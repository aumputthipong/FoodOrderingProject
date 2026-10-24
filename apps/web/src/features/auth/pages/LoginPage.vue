<script setup lang="ts">
import { Info } from '@lucide/vue'
import { loginSchema } from '@canteen/shared'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/error-messages'
import { toFormSchema } from '@/lib/form-schema'
import { useAuthStore } from '../index'
import { isDemoHintEnabled } from '../demo-hint'
import { homeFor, safeRedirect } from '../redirect'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const formError = ref<string | null>(null)

const hasRedirect = computed(() => safeRedirect(route.query.redirect) !== null)
const showDemoHint = computed(() => isDemoHintEnabled())

const signupLink = computed(() => ({
  name: 'signup',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const { handleSubmit, isSubmitting } = useForm({ validationSchema: toFormSchema(loginSchema) })

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    const user = await auth.login(values)
    await router.replace(safeRedirect(route.query.redirect) ?? homeFor(user))
  } catch (error) {
    formError.value = errorMessage(error, { UNAUTHORIZED: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' })
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="page-title">เข้าสู่ระบบ</CardTitle>
      <p v-if="hasRedirect" class="text-body-sm text-muted-foreground">เข้าสู่ระบบเพื่อสั่งอาหาร</p>
    </CardHeader>
    <CardContent>
      <form class="grid gap-4" novalidate @submit="onSubmit">
        <FormField v-slot="{ componentField }" name="username">
          <FormItem>
            <FormLabel>ชื่อผู้ใช้</FormLabel>
            <FormControl>
              <Input type="text" autocomplete="username" class="min-h-11" v-bind="componentField" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="password">
          <FormItem>
            <FormLabel>รหัสผ่าน</FormLabel>
            <FormControl>
              <Input
                type="password"
                autocomplete="current-password"
                class="min-h-11"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <p v-if="formError" role="alert" class="text-sm text-destructive">{{ formError }}</p>
        <Button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
        </Button>
        <p class="text-center text-sm text-muted-foreground">
          ยังไม่มีบัญชี?
          <RouterLink
            :to="signupLink"
            class="inline-flex min-h-11 items-center font-medium text-primary underline"
          >
            สมัครสมาชิก
          </RouterLink>
        </p>
      </form>
      <p
        v-if="showDemoHint"
        role="note"
        class="mt-4 flex items-start gap-2 rounded-card bg-accent/20 p-3 text-body-sm"
      >
        <Info class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>บัญชีทดลอง: customer1 (ลูกค้า) · merchant1 (ร้านค้า) · รหัสผ่าน Password123</span>
      </p>
    </CardContent>
  </Card>
</template>
