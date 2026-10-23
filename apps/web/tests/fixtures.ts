import {
  cartSchema,
  orderSchema,
  productSchema,
  shopDetailSchema,
  shopOrderSchema,
  shopSchema,
  userSchema,
  type Cart,
  type Order,
  type Product,
  type Shop,
  type ShopDetail,
  type ShopOrder,
  type User,
} from '@canteen/shared'

export function makeUser(overrides: Partial<User> = {}): User {
  return userSchema.parse({
    id: 1,
    username: 'somchai',
    firstName: 'สมชาย',
    lastName: 'ใจดี',
    email: 'somchai@example.com',
    mobile: '0812345678',
    role: 'customer',
    shopId: null,
    ...overrides,
  })
}

export function makeShop(overrides: Partial<Shop> = {}): Shop {
  return shopSchema.parse({
    id: 1,
    ownerId: 2,
    name: 'ร้านข้าวมันไก่',
    description: 'ข้าวมันไก่เจ้าเด็ด',
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  })
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return productSchema.parse({
    id: 1,
    shopId: 1,
    name: 'ข้าวมันไก่',
    description: 'ไก่ต้มนุ่ม',
    price: 50,
    imageUrl: null,
    status: 'available',
    ...overrides,
  })
}

export function makeShopDetail(overrides: Partial<ShopDetail> = {}): ShopDetail {
  return shopDetailSchema.parse({ ...makeShop(), products: [makeProduct()], ...overrides })
}

export function makeCart(overrides: Partial<Cart> = {}): Cart {
  return cartSchema.parse({
    id: 1,
    shop: { id: 1, name: 'ร้านข้าวมันไก่', imageUrl: null },
    items: [
      {
        id: 1,
        productId: 1,
        name: 'ข้าวมันไก่',
        imageUrl: null,
        price: 50,
        quantity: 2,
        subtotal: 100,
      },
    ],
    totalPrice: 100,
    ...overrides,
  })
}

const orderBase = {
  id: 1,
  status: 'waiting',
  createdAt: '2026-01-01T03:00:00.000Z',
  finishedAt: null,
  shop: { id: 1, name: 'ร้านข้าวมันไก่' },
  items: [
    {
      id: 1,
      productId: 1,
      name: 'ข้าวมันไก่',
      imageUrl: null,
      unitPrice: 50,
      quantity: 2,
      isDone: false,
    },
  ],
  totalPrice: 100,
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return orderSchema.parse({ ...orderBase, ...overrides })
}

export function makeShopOrder(overrides: Partial<ShopOrder> = {}): ShopOrder {
  return shopOrderSchema.parse({
    ...orderBase,
    customer: { id: 1, firstName: 'สมชาย', mobile: '0812345678' },
    ...overrides,
  })
}
