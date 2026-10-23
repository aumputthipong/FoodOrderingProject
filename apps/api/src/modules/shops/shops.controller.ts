import type { Request, RequestHandler } from 'express'
import type { User } from '@canteen/shared'
import { idParamSchema, shopFieldsSchema, shopSearchQuerySchema } from '@canteen/shared'
import { ValidationError } from '../../common/errors'
import { parse } from '../../common/validation'
import * as shopsService from './shops.service'

// Only used on routes behind requireAuth, which always sets req.user.
const currentUser = (req: Request): User => req.user as User

export const list: RequestHandler = async (req, res) => {
  const { search } = parse(shopSearchQuerySchema, req.query)
  res.json(await shopsService.listShops(search))
}

export const detail: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  res.json(await shopsService.getShopDetail(id))
}

export const create: RequestHandler = async (req, res) => {
  const input = parse(shopFieldsSchema, req.body)
  if (!req.file) {
    throw new ValidationError('Invalid request', [{ path: 'image', message: 'Image is required' }])
  }
  const shop = await shopsService.createShop(currentUser(req), input, req.file.filename)
  res.status(201).json(shop)
}

export const update: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  const input = parse(shopFieldsSchema, req.body)
  res.json(await shopsService.updateShop(currentUser(req), id, input, req.file?.filename))
}
