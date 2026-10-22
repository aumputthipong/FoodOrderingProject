import { api } from './helpers/app'

test('GET /api/health', async () => {
  const res = await api().get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ status: 'ok' })
})

test('unknown route returns NOT_FOUND shape', async () => {
  const res = await api().get('/api/nope')
  expect(res.status).toBe(404)
  expect(res.body.error.code).toBe('NOT_FOUND')
})

test('sets security headers', async () => {
  expect((await api().get('/api/health')).headers['x-content-type-options']).toBe('nosniff')
})

test('allows only configured CORS origins', async () => {
  const ok = await api().get('/api/health').set('Origin', 'http://localhost:5173')
  expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  const bad = await api().get('/api/health').set('Origin', 'http://evil.test')
  expect(bad.headers['access-control-allow-origin']).toBeUndefined()
})
