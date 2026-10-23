import { z } from 'zod'
import { api, configureApiClient } from './api-client'

const fetchMock = vi.fn()

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function lastRequest(): { url: URL; init: RequestInit; headers: Headers } {
  const [input, init] = fetchMock.mock.calls.at(-1) as [string | URL, RequestInit]
  return { url: new URL(String(input)), init, headers: new Headers(init.headers) }
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  configureApiClient({ getToken: () => null, onUnauthorized: undefined })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const okSchema = z.object({ status: z.literal('ok') })

test('sends bearer token and parses the response with the schema', async () => {
  configureApiClient({ getToken: () => 'tok' })
  fetchMock.mockResolvedValue(json(200, { status: 'ok' }))
  await expect(api.get('/api/health', { schema: okSchema })).resolves.toEqual({ status: 'ok' })
  expect(lastRequest().headers.get('Authorization')).toBe('Bearer tok')
})

test('omits the Authorization header without a token', async () => {
  fetchMock.mockResolvedValue(json(200, { status: 'ok' }))
  await api.get('/api/health', { schema: okSchema })
  expect(lastRequest().headers.has('Authorization')).toBe(false)
})

test('omits undefined query values', async () => {
  fetchMock.mockResolvedValue(json(200, { status: 'ok' }))
  await api.get('/api/shops', { schema: okSchema, query: { search: undefined, page: 2 } })
  const { url } = lastRequest()
  expect(url.pathname).toBe('/api/shops')
  expect(url.searchParams.has('search')).toBe(false)
  expect(url.searchParams.get('page')).toBe('2')
})

test('sends object bodies as JSON', async () => {
  fetchMock.mockResolvedValue(json(200, { status: 'ok' }))
  await api.post('/api/x', { schema: okSchema, body: { a: 1 } })
  const { init, headers } = lastRequest()
  expect(init.method).toBe('POST')
  expect(headers.get('Content-Type')).toBe('application/json')
  expect(init.body).toBe('{"a":1}')
})

test('passes FormData through without a content-type', async () => {
  fetchMock.mockResolvedValue(json(200, { status: 'ok' }))
  const form = new FormData()
  form.append('name', 'x')
  await api.post('/api/x', { schema: okSchema, body: form })
  const { init, headers } = lastRequest()
  expect(init.body).toBe(form)
  expect(headers.has('Content-Type')).toBe(false)
})

test('204 resolves to null', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  await expect(api.delete('/api/x', { schema: z.null() })).resolves.toBeNull()
})

test('maps an error body to ApiError with details', async () => {
  fetchMock.mockResolvedValue(
    json(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: [{ path: 'name', message: 'Required' }],
      },
    }),
  )
  await expect(api.post('/api/shops', { schema: z.unknown(), body: {} })).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
    details: [{ path: 'name', message: 'Required' }],
  })
})

test('an error body in an unknown format becomes INTERNAL_ERROR', async () => {
  fetchMock.mockResolvedValue(new Response('<html>oops</html>', { status: 502 }))
  await expect(api.get('/api/x', { schema: z.unknown() })).rejects.toMatchObject({
    status: 502,
    code: 'INTERNAL_ERROR',
  })
})

test('network failure becomes NETWORK_ERROR with status 0', async () => {
  fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(api.get('/api/x', { schema: z.unknown() })).rejects.toMatchObject({
    status: 0,
    code: 'NETWORK_ERROR',
  })
})

test('schema mismatch becomes INVALID_RESPONSE', async () => {
  fetchMock.mockResolvedValue(json(200, { status: 'nope' }))
  await expect(api.get('/api/x', { schema: okSchema })).rejects.toMatchObject({
    status: 200,
    code: 'INVALID_RESPONSE',
  })
})

test('a non-JSON success body becomes INVALID_RESPONSE', async () => {
  fetchMock.mockResolvedValue(new Response('not json', { status: 200 }))
  await expect(api.get('/api/x', { schema: okSchema })).rejects.toMatchObject({
    code: 'INVALID_RESPONSE',
  })
})

const unauthorized = () =>
  json(401, { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } })

test('401 with a token calls onUnauthorized and still throws; authRedirect:false does not', async () => {
  const onUnauthorized = vi.fn()
  configureApiClient({ getToken: () => 'tok', onUnauthorized })
  fetchMock.mockImplementation(() => Promise.resolve(unauthorized()))
  await expect(api.get('/api/me', { schema: z.unknown() })).rejects.toMatchObject({ status: 401 })
  expect(onUnauthorized).toHaveBeenCalledTimes(1)
  await expect(
    api.get('/api/me', { schema: z.unknown(), authRedirect: false }),
  ).rejects.toMatchObject({ status: 401 })
  expect(onUnauthorized).toHaveBeenCalledTimes(1)
})

test('401 without a token does not call onUnauthorized', async () => {
  const onUnauthorized = vi.fn()
  configureApiClient({ getToken: () => null, onUnauthorized })
  fetchMock.mockResolvedValue(unauthorized())
  await expect(api.get('/api/me', { schema: z.unknown() })).rejects.toMatchObject({ status: 401 })
  expect(onUnauthorized).not.toHaveBeenCalled()
})
