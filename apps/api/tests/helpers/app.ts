import request from 'supertest'
import { createApp } from '../../src/app'

export function api(options?: Parameters<typeof createApp>[0]) {
  return request(createApp(options))
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}
