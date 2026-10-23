import express from 'express'
import request from 'supertest'
import { errorHandler } from '../src/common/middlewares/errorHandler'
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

test('malformed JSON body returns VALIDATION_ERROR', async () => {
  const res = await api().post('/api/health').set('Content-Type', 'application/json').send('{')
  expect(res.status).toBe(400)
  expect(res.body.error.code).toBe('VALIDATION_ERROR')
})

test('JSON body over the 100 kB limit is a 413 with the standard error shape', async () => {
  const res = await api()
    .post('/api/auth/login')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ username: 'x'.repeat(200_000), password: 'y' }))
  expect(res.status).toBe(413)
  expect(res.body).toEqual({
    error: { code: 'VALIDATION_ERROR', message: 'Request body too large' },
  })
})

test('JSON body in an unsupported charset is a 415 with the standard error shape', async () => {
  const res = await api()
    .post('/api/auth/login')
    .set('Content-Type', 'application/json; charset=latin1')
    .send('{"username":"a","password":"b"}')
  expect(res.status).toBe(415)
  expect(res.body.error.code).toBe('VALIDATION_ERROR')
  expect(typeof res.body.error.message).toBe('string')
})

test('errorHandler turns unexpected errors into 500 without req.log', async () => {
  const app = express()
    .get('/boom', () => {
      throw new Error('x')
    })
    .use(errorHandler)
  const res = await request(app).get('/boom')
  expect(res.status).toBe(500)
  expect(res.body).toEqual({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  })
})
