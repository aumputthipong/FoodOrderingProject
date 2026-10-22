import cors from 'cors'
import express, { type Express } from 'express'
import helmet from 'helmet'
import { pinoHttp } from 'pino-http'
import { errorHandler } from './common/middlewares/errorHandler'
import { notFound } from './common/middlewares/notFound'
import { env } from './config/env'
import { healthRouter } from './modules/health/health.routes'

export type CreateAppOptions = { loginRateLimitPerMinute?: number }

export function createApp(options: CreateAppOptions = {}): Express {
  // Consumed by the auth router once it exists (Task 5).
  const { loginRateLimitPerMinute = env.LOGIN_RATE_LIMIT_PER_MINUTE } = options
  void loginRateLimitPerMinute

  const app = express()

  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGINS }))
  if (env.NODE_ENV !== 'test') app.use(pinoHttp())
  app.use(express.json())
  app.use('/uploads', express.static(env.UPLOAD_DIR))

  const apiRouter = express.Router()
  apiRouter.use(healthRouter)
  app.use('/api', apiRouter)

  app.use(notFound)
  app.use(errorHandler)
  return app
}
