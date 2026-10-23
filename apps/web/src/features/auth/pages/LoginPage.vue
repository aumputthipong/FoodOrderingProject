<script setup lang="ts">
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
import { homeFor, safeRedirect } from '../redirect'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const formError = ref<string | null>(null)

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
      <CardTitle class="font-heading text-xl">เข้าสู่ระบบ</CardTitle>
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
    </CardContent>
  </Card>
</template>
