import {
  loginResponseSchema,
  userSchema,
  type LoginInput,
  type LoginResponse,
  type SignupInput,
  type User,
} from '@canteen/shared'
import { z } from 'zod'
import { api } from '@/lib/api-client'

export function login(input: LoginInput): Promise<LoginResponse> {
  return api.post('/api/auth/login', {
    schema: loginResponseSchema,
    body: input,
    authRedirect: false,
  })
}

export function signup(input: SignupInput): Promise<User> {
  return api.post('/api/auth/signup', { schema: userSchema, body: input })
}

export function fetchMe(options: { authRedirect?: boolean } = {}): Promise<User> {
  return api.get('/api/auth/me', { schema: userSchema, authRedirect: options.authRedirect })
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout', { schema: z.null() })
}
