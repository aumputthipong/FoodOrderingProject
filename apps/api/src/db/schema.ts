import { ORDER_STATUSES, PRODUCT_STATUSES, ROLES } from '@canteen/shared'
import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  unique,
  varchar,
} from 'drizzle-orm/mysql-core'

const createdAt = () => timestamp().notNull().defaultNow()
const updatedAt = () => timestamp().notNull().defaultNow().onUpdateNow()

export const users = mysqlTable(
  'users',
  {
    id: int().primaryKey().autoincrement(),
    username: varchar({ length: 20 }).notNull(),
    passwordHash: varchar({ length: 255 }).notNull(),
    firstName: varchar({ length: 150 }).notNull(),
    lastName: varchar({ length: 150 }).notNull(),
    email: varchar({ length: 100 }).notNull(),
    mobile: varchar({ length: 10 }).notNull(),
    role: mysqlEnum(ROLES).notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique('users_username_unique').on(table.username)],
)

export const authTokens = mysqlTable(
  'auth_tokens',
  {
    id: int().primaryKey().autoincrement(),
    userId: int()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: char({ length: 64 }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique('auth_tokens_token_hash_unique').on(table.tokenHash)],
)

export const shops = mysqlTable(
  'shops',
  {
    id: int().primaryKey().autoincrement(),
    ownerId: int()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    imageFilename: varchar({ length: 255 }),
    createdAt: createdAt(),
  },
  (table) => [unique('shops_owner_id_unique').on(table.ownerId)],
)

export const products = mysqlTable('products', {
  id: int().primaryKey().autoincrement(),
  shopId: int()
    .notNull()
    .references(() => shops.id, { onDelete: 'cascade' }),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  price: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  imageFilename: varchar({ length: 255 }),
  status: mysqlEnum(PRODUCT_STATUSES).notNull().default('not-available'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const carts = mysqlTable(
  'carts',
  {
    id: int().primaryKey().autoincrement(),
    userId: int()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    shopId: int()
      .notNull()
      .references(() => shops.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [unique('carts_user_id_shop_id_unique').on(table.userId, table.shopId)],
)

export const cartItems = mysqlTable(
  'cart_items',
  {
    id: int().primaryKey().autoincrement(),
    cartId: int()
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: int()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    quantity: int().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('cart_items_cart_id_product_id_unique').on(table.cartId, table.productId),
    check('cart_items_quantity_min', sql`${table.quantity} >= 1`),
  ],
)

export const orders = mysqlTable('orders', {
  id: int().primaryKey().autoincrement(),
  customerId: int()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  shopId: int()
    .notNull()
    .references(() => shops.id, { onDelete: 'cascade' }),
  status: mysqlEnum(ORDER_STATUSES).notNull().default('waiting'),
  createdAt: createdAt(),
  finishedAt: timestamp(),
})

export const orderItems = mysqlTable('order_items', {
  id: int().primaryKey().autoincrement(),
  orderId: int()
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: int()
    .notNull()
    .references(() => products.id, { onDelete: 'restrict' }),
  quantity: int().notNull(),
  unitPrice: decimal({ precision: 10, scale: 2, mode: 'number' }).notNull(),
  isDone: boolean().notNull().default(false),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type AuthToken = typeof authTokens.$inferSelect
export type Shop = typeof shops.$inferSelect
export type NewShop = typeof shops.$inferInsert
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Cart = typeof carts.$inferSelect
export type CartItem = typeof cartItems.$inferSelect
export type Order = typeof orders.$inferSelect
export type OrderItem = typeof orderItems.$inferSelect
