import { api } from './helpers/app'

const expected = [
  '/api/health',
  '/api/auth/signup',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/me',
  '/api/shops',
  '/api/shops/{id}',
  '/api/shops/{shopId}/products',
  '/api/products/{id}',
  '/api/products/{id}/status',
  '/api/cart',
  '/api/cart/shops/{shopId}/items',
  '/api/cart/items/{id}',
  '/api/orders',
  '/api/orders/mine',
  '/api/shops/mine/orders',
  '/api/orders/{id}/status',
  '/api/order-items/{id}',
]

test('documents every endpoint', async () => {
  const res = await api().get('/api/openapi.json')
  expect(Object.keys(res.body.paths).sort()).toEqual([...expected].sort())
  expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
})

test('documents the 404 of a cart replace for an unknown shop', async () => {
  const res = await api().get('/api/openapi.json')
  const responses = res.body.paths['/api/cart/shops/{shopId}/items'].put.responses
  expect(Object.keys(responses).sort()).toEqual(['200', '204', '400', '401', '404'])
})

test('serves Swagger UI', async () => {
  const res = await api().get('/api/docs/')
  expect(res.status).toBe(200)
  expect(res.headers['content-type']).toMatch(/text\/html/)
})
