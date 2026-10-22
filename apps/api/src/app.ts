import cors from 'cors'
import express, { type Express } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { AppError } from './common/errors'
import { errorHandler } from './common/middlewares/errorHandler'
import { notFound } from './common/middlewares/notFound'
import { env } from './config/env'
import { createAuthRouter } from './modules/auth/auth.routes'
import { healthRouter } from './modules/health/health.routes'
import { shopsRouter } from './modules/shops/shops.routes'

export type CreateAppOptions = { loginRateLimitPerMinute?: number }

export function createApp(options: CreateAppOptions = {}): Express {
  const { loginRateLimitPerMinute = env.LOGIN_RATE_LIMIT_PER_MINUTE } = options
  // Created per app so each instance (and each test) has its own counter store.
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: loginRateLimitPerMinute,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError(429, 'RATE_LIMITED', 'Too many login attempts, please try again later'))
    },
  })

  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGINS }))
  if (env.NODE_ENV !== 'test')
    app.use(pinoHttp({ redact: ['req.headers.authorization', 'req.headers.cookie'] }))
  app.use(express.json())
  app.use('/uploads', express.static(env.UPLOAD_DIR))

  const apiRouter = express.Router()
  apiRouter.use(healthRouter)
  apiRouter.use('/auth', createAuthRouter(loginLimiter))
  apiRouter.use('/shops', shopsRouter)
  app.use('/api', apiRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
