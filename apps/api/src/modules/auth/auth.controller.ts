import type { RequestHandler } from 'express'
import { loginSchema, signupSchema } from '@canteen/shared'
import { parse } from '../../common/validation'
import * as authService from './auth.service'

export const signup: RequestHandler = async (req, res) => {
  const user = await authService.signup(parse(signupSchema, req.body))
  res.status(201).json(user)
}

export const login: RequestHandler = async (req, res) => {
  const result = await authService.login(parse(loginSchema, req.body))
  res.json(result)
}

export const logout: RequestHandler = async (req, res) => {
  // requireAuth guarantees authTokenHash is set.
  await authService.logout(req.authTokenHash as string)
  res.status(204).end()
}

export const me: RequestHandler = (req, res) => {
  res.json(req.user)
}
