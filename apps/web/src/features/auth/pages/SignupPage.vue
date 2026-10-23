<script setup lang="ts">
import { signupSchema } from '@canteen/shared'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { isApiError } from '@/lib/api-error'
import { applyServerErrors } from '@/lib/form-errors'
import { toFormSchema } from '@/lib/form-schema'
import { useAuthStore } from '../index'
import { homeFor, safeRedirect } from '../redirect'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const formError = ref<string | null>(null)

const textFields = [
  { name: 'username', label: 'ชื่อผู้ใช้', type: 'text', autocomplete: 'username' },
  { name: 'password', label: 'รหัสผ่าน', type: 'password', autocomplete: 'new-password' },
  {
    name: 'confirmPassword',
    label: 'ยืนยันรหัสผ่าน',
    type: 'password',
    autocomplete: 'new-password',
  },
  { name: 'firstName', label: 'ชื่อ', type: 'text', autocomplete: 'given-name' },
  { name: 'lastName', label: 'นามสกุล', type: 'text', autocomplete: 'family-name' },
  { name: 'email', label: 'อีเมล', type: 'email', autocomplete: 'email' },
  { name: 'mobile', label: 'เบอร์มือถือ', type: 'tel', autocomplete: 'tel' },
] as const

type FieldName = (typeof textFields)[number]['name'] | 'role'
const fieldNames: readonly string[] = [...textFields.map((field) => field.name), 'role']

const loginLink = computed(() => ({
  name: 'login',
  query: route.query.redirect ? { redirect: route.query.redirect } : {},
}))

const { handleSubmit, isSubmitting, setFieldError } = useForm({
  validationSchema: toFormSchema(signupSchema),
  initialValues: { role: 'customer' as const },
})

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    const user = await auth.signup(values)
    await router.replace(safeRedirect(route.query.redirect) ?? homeFor(user))
  } catch (error) {
    if (isApiError(error) && error.code === 'CONFLICT') {
      setFieldError('username', 'ชื่อผู้ใช้นี้ถูกใช้แล้ว')
      return
    }
    formError.value = applyServerErrors(
      error,
      (field, message) => setFieldError(field as FieldName, message),
      fieldNames,
    )
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="font-heading text-xl">สมัครสมาชิก</CardTitle>
    </CardHeader>
    <CardContent>
      <form class="grid gap-4" novalidate @submit="onSubmit">
        <FormField
          v-for="field in textFields"
          :key="field.name"
          v-slot="{ componentField }"
          :name="field.name"
        >
          <FormItem>
            <FormLabel>{{ field.label }}</FormLabel>
            <FormControl>
              <Input
                :type="field.type"
                :autocomplete="field.autocomplete"
                class="min-h-11"
                v-bind="componentField"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <FormField v-slot="{ componentField }" name="role">
          <FormItem>
            <FormLabel>สมัครเป็น</FormLabel>
            <FormControl>
              <RadioGroup class="grid-cols-2" v-bind="componentField">
                <Label
                  for="role-customer"
                  class="flex min-h-11 items-center gap-2 rounded-md border px-3"
                >
                  <RadioGroupItem id="role-customer" value="customer" />
                  ลูกค้า
                </Label>
                <Label
                  for="role-merchant"
                  class="flex min-h-11 items-center gap-2 rounded-md border px-3"
                >
                  <RadioGroupItem id="role-merchant" value="merchant" />
                  ร้านค้า
                </Label>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <p v-if="formError" role="alert" class="text-sm text-destructive">{{ formError }}</p>
        <Button type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก' }}
        </Button>
        <p class="text-center text-sm text-muted-foreground">
          มีบัญชีอยู่แล้ว?
          <RouterLink
            :to="loginLink"
            class="inline-flex min-h-11 items-center font-medium text-primary underline"
          >
            เข้าสู่ระบบ
          </RouterLink>
        </p>
      </form>
    </CardContent>
  </Card>
</template>
