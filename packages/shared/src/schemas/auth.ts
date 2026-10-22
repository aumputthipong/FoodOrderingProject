import { z } from 'zod'
import { ROLES, SIGNUP_ROLES } from '../constants'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a digit')

export const signupSchema = z
  .object({
    username: z.string().min(5).max(20),
    password: passwordSchema,
    confirmPassword: z.string(),
    firstName: z.string().min(1).max(150),
    lastName: z.string().min(1).max(150),
    email: z.email().max(100),
    mobile: z.string().regex(/^0[0-9]{9}$/, 'Mobile must be 10 digits starting with 0'),
    role: z.enum(SIGNUP_ROLES),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export const userSchema = z.object({
  id: z.number().int(),
  username: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  mobile: z.string(),
  role: z.enum(ROLES),
  shopId: z.number().int().nullable(),
})

export const loginResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
})

export type SignupInput = z.infer<typeof signupSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type User = z.infer<typeof userSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
