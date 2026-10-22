import type { Request, RequestHandler } from 'express'
import type { User } from '@canteen/shared'
import {
  idParamSchema,
  productFieldsSchema,
  productStatusBodySchema,
  shopIdParamSchema,
} from '@canteen/shared'
import { ValidationError } from '../../common/errors'
import { parse } from '../../common/validation'
import * as productsService from './products.service'

// Only used on routes behind requireAuth, which always sets req.user.
const currentUser = (req: Request): User => req.user as User

export const create: RequestHandler = async (req, res) => {
  const { shopId } = parse(shopIdParamSchema, req.params)
  const input = parse(productFieldsSchema, req.body)
  if (!req.file) {
    throw new ValidationError('Invalid request', [{ path: 'image', message: 'Image is required' }])
  }
  const product = await productsService.createProduct(
    currentUser(req),
    shopId,
    input,
    req.file.filename,
  )
  res.status(201).json(product)
}

export const update: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  const input = parse(productFieldsSchema, req.body)
  res.json(await productsService.updateProduct(currentUser(req), id, input, req.file?.filename))
}

export const setStatus: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  const { status } = parse(productStatusBodySchema, req.body)
  res.json(await productsService.setProductStatus(currentUser(req), id, status))
}
