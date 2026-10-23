export const ROLES = ['customer', 'merchant', 'admin'] as const
export const SIGNUP_ROLES = ['customer', 'merchant'] as const
export const PRODUCT_STATUSES = ['available', 'not-available'] as const
export const ORDER_STATUSES = ['waiting', 'finished'] as const

export type Role = (typeof ROLES)[number]
export type SignupRole = (typeof SIGNUP_ROLES)[number]
export type ProductStatus = (typeof PRODUCT_STATUSES)[number]
export type OrderStatus = (typeof ORDER_STATUSES)[number]
