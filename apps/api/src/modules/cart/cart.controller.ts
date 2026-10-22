import type { Request, RequestHandler } from 'express'
import type { User } from '@canteen/shared'
import {
  cartQuerySchema,
  idParamSchema,
  replaceCartItemsSchema,
  shopIdParamSchema,
  updateCartItemSchema,
} from '@canteen/shared'
import { parse } from '../../common/validation'
import * as cartService from './cart.service'

// Only used on routes behind requireAuth, which always sets req.user.
const currentUser = (req: Request): User => req.user as User

export const list: RequestHandler = async (req, res) => {
  const { shopId } = parse(cartQuerySchema, req.query)
  res.json(await cartService.listCarts(currentUser(req).id, shopId))
}

export const replaceItems: RequestHandler = async (req, res) => {
  const { shopId } = parse(shopIdParamSchema, req.params)
  const { items } = parse(replaceCartItemsSchema, req.body)
  const cart = await cartService.replaceCartItems(currentUser(req).id, shopId, items)
  if (cart) res.json(cart)
  else res.status(204).end()
}

export const updateItem: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  const { quantity } = parse(updateCartItemSchema, req.body)
  res.json(await cartService.updateCartItem(currentUser(req).id, id, quantity))
}

export const removeItem: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  await cartService.removeCartItem(currentUser(req).id, id)
  res.status(204).end()
}
