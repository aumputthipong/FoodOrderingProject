import type { Request, RequestHandler } from 'express'
import type { User } from '@canteen/shared'
import {
  checkoutSchema,
  idParamSchema,
  updateOrderItemSchema,
  updateOrderStatusSchema,
} from '@canteen/shared'
import { parse } from '../../common/validation'
import * as ordersService from './orders.service'

// Only used on routes behind requireAuth, which always sets req.user.
const currentUser = (req: Request): User => req.user as User

export const checkout: RequestHandler = async (req, res) => {
  const { cartId } = parse(checkoutSchema, req.body)
  res.status(201).json(await ordersService.checkout(currentUser(req).id, cartId))
}

export const listMine: RequestHandler = async (req, res) => {
  res.json(await ordersService.listMyOrders(currentUser(req).id))
}

export const listForShop: RequestHandler = async (req, res) => {
  res.json(await ordersService.listShopOrders(currentUser(req)))
}

export const setStatus: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  const { status } = parse(updateOrderStatusSchema, req.body)
  res.json(await ordersService.setOrderStatus(currentUser(req), id, status))
}

export const setItemDone: RequestHandler = async (req, res) => {
  const { id } = parse(idParamSchema, req.params)
  const { isDone } = parse(updateOrderItemSchema, req.body)
  res.json(await ordersService.setOrderItemDone(currentUser(req), id, isDone))
}
