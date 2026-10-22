import type { RequestHandler } from 'express'
import type { Role } from '@canteen/shared'
import { ForbiddenError, UnauthorizedError } from '../errors'

/** Allows only the given roles; must run after `requireAuth`. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new UnauthorizedError()
    if (!roles.includes(req.user.role)) throw new ForbiddenError()
    next()
  }
}
