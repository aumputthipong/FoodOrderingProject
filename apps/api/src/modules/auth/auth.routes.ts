import { Router, type RequestHandler } from 'express'
import { requireAuth } from '../../common/middlewares/requireAuth'
import * as controller from './auth.controller'

/** `loginLimiter` is injected by `createApp` so every app instance owns its own rate-limit store. */
export function createAuthRouter(loginLimiter: RequestHandler): Router {
  const router = Router()
  router.post('/signup', controller.signup)
  router.post('/login', loginLimiter, controller.login)
  router.post('/logout', requireAuth, controller.logout)
  router.get('/me', requireAuth, controller.me)
  return router
}
