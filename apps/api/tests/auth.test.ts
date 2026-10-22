import { db } from '../src/db/client'
import { authTokens, shops, users } from '../src/db/schema'
import { hashToken } from '../src/modules/auth/token'
import { api, auth } from './helpers/app'
import { createUser, loginAs } from './helpers/factories'

const validSignup = {
  username: 'somchai',
  password: 'Passw0rd',
  confirmPassword: 'Passw0rd',
  firstName: 'Som',
  lastName: 'Chai',
  email: 's@example.com',
  mobile: '0812345678',
  role: 'customer',
}

describe('POST /api/auth/signup', () => {
  test('signup returns the user without secrets', async () => {
    const res = await api().post('/api/auth/signup').send(validSignup)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ username: 'somchai', role: 'customer', shopId: null })
    expect(res.body).not.toHaveProperty('password')
    expect(res.body).not.toHaveProperty('passwordHash')
  })

  test('signup stores a bcrypt hash, not the password', async () => {
    await api().post('/api/auth/signup').send(validSignup)
    const [row] = await db.select().from(users)
    expect(row?.passwordHash).toMatch(/^\$2[aby]\$10\$/)
    expect(row?.passwordHash).not.toContain('Passw0rd')
  })

  test('signup rejects admin role (B1)', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ ...validSignup, role: 'admin' })
    expect(res.status).toBe(400)
    expect(res.body.error.details).toContainEqual(expect.objectContaining({ path: 'role' }))
  })

  test('signup rejects a taken username with 409', async () => {
    const first = await api().post('/api/auth/signup').send(validSignup)
    expect(first.status).toBe(201)
    const second = await api().post('/api/auth/signup').send(validSignup)
    expect(second.status).toBe(409)
    expect(second.body.error.code).toBe('CONFLICT')
  })

  test('signup answers 409 (not 500) when two requests race for one username', async () => {
    const app = api()
    const results = await Promise.all([
      app.post('/api/auth/signup').send(validSignup),
      app.post('/api/auth/signup').send(validSignup),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([201, 409])
  })
})

describe('POST /api/auth/login', () => {
  test('login stores only the token hash (B11)', async () => {
    const user = await createUser()
    const { body } = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: user.password })
    expect(body.token).toMatch(/^[0-9a-f]{64}$/)
    expect(body.user).toMatchObject({ id: user.id, username: user.username, shopId: null })
    expect(body.user).not.toHaveProperty('passwordHash')
    const rows = await db.select().from(authTokens)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.tokenHash).toBe(hashToken(body.token))
    expect(rows[0]?.tokenHash).not.toBe(body.token)
  })

  test('login returns the shop id of a shop owner', async () => {
    const owner = await createUser({ role: 'merchant' })
    const [result] = await db
      .insert(shops)
      .values({ ownerId: owner.id, name: 'Noodles', description: 'Tasty' })
    const { body } = await api()
      .post('/api/auth/login')
      .send({ username: owner.username, password: owner.password })
    expect(body.user.shopId).toBe(result.insertId)
  })

  test('login fails with the same 401 message for unknown user and wrong password', async () => {
    const user = await createUser()
    const unknown = await api().post('/api/auth/login').send({ username: 'nobody', password: 'x' })
    const wrong = await api()
      .post('/api/auth/login')
      .send({ username: user.username, password: 'WrongPass1' })
    expect(unknown.status).toBe(401)
    expect(wrong.status).toBe(401)
    expect(unknown.body).toEqual(wrong.body)
    expect(unknown.body.error.code).toBe('UNAUTHORIZED')
  })

  test('login validates the body', async () => {
    const res = await api().post('/api/auth/login').send({ username: 'x' })
    expect(res.status).toBe(400)
  })

  test('each login issues a new working token', async () => {
    const user = await createUser()
    const a = await loginAs(user)
    const b = await loginAs(user)
    expect(a).not.toBe(b)
    expect((await api().get('/api/auth/me').set(auth(a))).status).toBe(200)
    expect((await api().get('/api/auth/me').set(auth(b))).status).toBe(200)
  })

  test('rate limits login attempts', async () => {
    const app = api({ loginRateLimitPerMinute: 3 })
    for (let i = 0; i < 3; i++)
      await app.post('/api/auth/login').send({ username: 'x', password: 'y' })
    const res = await app.post('/api/auth/login').send({ username: 'x', password: 'y' })
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })

  test('the login rate limit does not apply to other routes', async () => {
    const app = api({ loginRateLimitPerMinute: 1 })
    for (let i = 0; i < 3; i++) expect((await app.get('/api/health')).status).toBe(200)
  })
})

describe('GET /api/auth/me', () => {
  test('returns the current user', async () => {
    const user = await createUser({ firstName: 'Mali' })
    const token = await loginAs(user)
    const res = await api().get('/api/auth/me').set(auth(token))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: user.id,
      username: user.username,
      firstName: 'Mali',
      lastName: 'User',
      email: `${user.username}@example.com`,
      mobile: '0812345678',
      role: 'customer',
      shopId: null,
    })
  })

  test('GET /me requires a valid Bearer token', async () => {
    const token = await loginAs(await createUser())
    const noHeader = await api().get('/api/auth/me')
    const garbage = await api().get('/api/auth/me').set('Authorization', 'Bearer nonsense')
    const wrongScheme = await api().get('/api/auth/me').set('Authorization', `Token ${token}`)
    for (const res of [noHeader, garbage, wrongScheme]) {
      expect(res.status).toBe(401)
      expect(res.body.error.code).toBe('UNAUTHORIZED')
    }
  })
})

describe('POST /api/auth/logout', () => {
  test('logout revokes the current token (B11)', async () => {
    const token = await loginAs(await createUser())
    expect(
      (await api().post('/api/auth/logout').set('Authorization', `Bearer ${token}`)).status,
    ).toBe(204)
    expect((await api().get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(
      401,
    )
  })

  test('logout only revokes the token used, not the other sessions of the user', async () => {
    const user = await createUser()
    const a = await loginAs(user)
    const b = await loginAs(user)
    await api().post('/api/auth/logout').set(auth(a))
    expect((await api().get('/api/auth/me').set(auth(b))).status).toBe(200)
  })

  test('logout requires authentication', async () => {
    expect((await api().post('/api/auth/logout')).status).toBe(401)
  })
})
