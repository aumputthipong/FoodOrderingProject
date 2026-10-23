import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi'
import {
  cartItemSchema,
  cartQuerySchema,
  cartSchema,
  checkoutSchema,
  errorResponseSchema,
  idParamSchema,
  loginResponseSchema,
  loginSchema,
  orderItemSchema,
  orderListSchema,
  orderSchema,
  productFieldsSchema,
  productSchema,
  productStatusBodySchema,
  replaceCartItemsSchema,
  shopDetailSchema,
  shopFieldsSchema,
  shopIdParamSchema,
  shopOrderListSchema,
  shopOrderSchema,
  shopSchema,
  shopSearchQuerySchema,
  signupSchema,
  updateCartItemSchema,
  updateOrderItemSchema,
  updateOrderStatusSchema,
  userSchema,
} from '@canteen/shared'
import { z } from 'zod'

const imageField = z.string().meta({ type: 'string', format: 'binary' })
const shopCreateForm = shopFieldsSchema.extend({ image: imageField })
const shopUpdateForm = shopFieldsSchema.extend({ image: imageField.optional() })
const productCreateForm = productFieldsSchema.extend({ image: imageField })
const productUpdateForm = productFieldsSchema.extend({ image: imageField.optional() })

const errorText: Record<number, string> = {
  400: 'Validation error',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
  429: 'Too many requests',
}

type Def = {
  method: RouteConfig['method']
  path: string
  tag: string
  summary: string
  auth?: boolean
  params?: z.ZodObject
  query?: z.ZodObject
  body?: z.ZodType
  multipart?: z.ZodObject
  status: number
  response?: z.ZodType
  /** Additional success statuses: a schema, or a description for an empty body. */
  extraStatus?: Record<number, z.ZodType | string>
  errors?: number[]
}

const json = (schema: z.ZodType) => ({ 'application/json': { schema } })

function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry()
  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
  })

  const add = (d: Def) => {
    const responses: RouteConfig['responses'] = {}
    responses[d.status] = d.response
      ? { description: 'Success', content: json(d.response) }
      : { description: 'Success (no content)' }
    for (const [code, v] of Object.entries(d.extraStatus ?? {})) {
      responses[Number(code)] =
        typeof v === 'string' ? { description: v } : { description: 'Success', content: json(v) }
    }
    const errors = new Set(d.errors ?? [])
    if (d.params || d.query || d.body || d.multipart) errors.add(400)
    if (d.auth) errors.add(401)
    for (const code of errors) {
      responses[code] = { description: errorText[code] ?? 'Error', content: json(errorResponseSchema) }
    }

    const content = d.multipart
      ? { 'multipart/form-data': { schema: d.multipart } }
      : d.body
        ? json(d.body)
        : undefined

    registry.registerPath({
      method: d.method,
      path: d.path,
      tags: [d.tag],
      summary: d.summary,
      ...(d.auth ? { security: [{ bearerAuth: [] }] } : {}),
      request: {
        ...(d.params ? { params: d.params } : {}),
        ...(d.query ? { query: d.query } : {}),
        ...(content ? { body: { required: true, content } } : {}),
      },
      responses,
    })
  }

  // Health
  add({ method: 'get', path: '/api/health', tag: 'Health', summary: 'Health check', status: 200, response: z.object({ status: z.literal('ok') }) })

  // Auth
  add({ method: 'post', path: '/api/auth/signup', tag: 'Auth', summary: 'Register a user', body: signupSchema, status: 201, response: userSchema, errors: [409] })
  add({ method: 'post', path: '/api/auth/login', tag: 'Auth', summary: 'Log in (rate limited)', body: loginSchema, status: 200, response: loginResponseSchema, errors: [401, 429] })
  add({ method: 'post', path: '/api/auth/logout', tag: 'Auth', summary: 'Log out and revoke the current token', auth: true, status: 204 })
  add({ method: 'get', path: '/api/auth/me', tag: 'Auth', summary: 'Current user', auth: true, status: 200, response: userSchema })

  // Shops
  add({ method: 'get', path: '/api/shops', tag: 'Shops', summary: 'List shops', query: shopSearchQuerySchema, status: 200, response: z.array(shopSchema) })
  add({ method: 'get', path: '/api/shops/{id}', tag: 'Shops', summary: 'Shop with its products', params: idParamSchema, status: 200, response: shopDetailSchema, errors: [404] })
  add({ method: 'post', path: '/api/shops', tag: 'Shops', summary: 'Create a shop (merchant/admin)', auth: true, multipart: shopCreateForm, status: 201, response: shopSchema, errors: [403, 409] })
  add({ method: 'put', path: '/api/shops/{id}', tag: 'Shops', summary: 'Update a shop (owner/admin)', auth: true, params: idParamSchema, multipart: shopUpdateForm, status: 200, response: shopSchema, errors: [403, 404] })

  // Products
  add({ method: 'post', path: '/api/shops/{shopId}/products', tag: 'Products', summary: 'Create a product (owner/admin)', auth: true, params: shopIdParamSchema, multipart: productCreateForm, status: 201, response: productSchema, errors: [403, 404] })
  add({ method: 'put', path: '/api/products/{id}', tag: 'Products', summary: 'Update a product (owner/admin)', auth: true, params: idParamSchema, multipart: productUpdateForm, status: 200, response: productSchema, errors: [403, 404] })
  add({ method: 'patch', path: '/api/products/{id}/status', tag: 'Products', summary: 'Change product status (owner/admin)', auth: true, params: idParamSchema, body: productStatusBodySchema, status: 200, response: productSchema, errors: [403, 404] })

  // Cart
  add({ method: 'get', path: '/api/cart', tag: 'Cart', summary: 'List my carts', auth: true, query: cartQuerySchema, status: 200, response: z.array(cartSchema) })
  add({ method: 'put', path: '/api/cart/shops/{shopId}/items', tag: 'Cart', summary: 'Replace cart items for a shop', auth: true, params: shopIdParamSchema, body: replaceCartItemsSchema, status: 200, response: cartSchema, extraStatus: { 204: 'Cart removed (items was empty)' } })
  add({ method: 'patch', path: '/api/cart/items/{id}', tag: 'Cart', summary: 'Update item quantity', auth: true, params: idParamSchema, body: updateCartItemSchema, status: 200, response: cartItemSchema, errors: [404] })
  add({ method: 'delete', path: '/api/cart/items/{id}', tag: 'Cart', summary: 'Remove cart item', auth: true, params: idParamSchema, status: 204, errors: [404] })

  // Orders
  add({ method: 'post', path: '/api/orders', tag: 'Orders', summary: 'Checkout a cart', auth: true, body: checkoutSchema, status: 201, response: orderSchema, errors: [404] })
  add({ method: 'get', path: '/api/orders/mine', tag: 'Orders', summary: 'My orders', auth: true, status: 200, response: orderListSchema })
  add({ method: 'get', path: '/api/shops/mine/orders', tag: 'Orders', summary: 'My shop queue (merchant/admin)', auth: true, status: 200, response: shopOrderListSchema, errors: [403, 404] })
  add({ method: 'patch', path: '/api/orders/{id}/status', tag: 'Orders', summary: 'Change order status (shop owner/admin)', auth: true, params: idParamSchema, body: updateOrderStatusSchema, status: 200, response: shopOrderSchema, errors: [403, 404] })
  add({ method: 'patch', path: '/api/order-items/{id}', tag: 'Orders', summary: 'Mark order item done (shop owner/admin)', auth: true, params: idParamSchema, body: updateOrderItemSchema, status: 200, response: orderItemSchema, errors: [403, 404] })

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'Canteen Ordering API', version: '1.0.0' },
  })
}

export { buildOpenApiDocument }

let cached: ReturnType<typeof buildOpenApiDocument> | undefined
/** Built once on first use, then reused for every request. */
export function getOpenApiDocument() {
  return (cached ??= buildOpenApiDocument())
}
