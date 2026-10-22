import type { RequestHandler } from 'express'
import { findUserByToken } from '../../modules/auth/auth.service'
import { UnauthorizedError } from '../errors'

const BEARER = /^Bearer (\S+)$/

/** Resolves `Authorization: Bearer <token>` to `req.user` / `req.authTokenHash`, or 401. */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const match = BEARER.exec(req.headers.authorization ?? '')
  if (!match?.[1]) throw new UnauthorizedError()

  const found = await findUserByToken(match[1])
  if (!found) throw new UnauthorizedError()

  req.user = found.user
  req.authTokenHash = found.tokenHash
  next()
}
