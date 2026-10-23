import { Router } from 'express'
import { requireAuth } from '../../common/middlewares/requireAuth'
import { requireRole } from '../../common/middlewares/requireRole'
import * as controller from './orders.controller'

/** Mounted at the API root: order routes live under both `/orders` and `/order-items`. */
export const ordersRouter = Router()
ordersRouter.post('/orders', requireAuth, controller.checkout)
ordersRouter.get('/orders/mine', requireAuth, controller.listMine)
ordersRouter.patch('/orders/:id/status', requireAuth, controller.setStatus)
ordersRouter.patch('/order-items/:id', requireAuth, controller.setItemDone)

/** Mounted at `/shops/mine/orders`, ahead of the shops router so `mine` is not read as `/:id`. */
export const shopOrdersRouter = Router()
shopOrdersRouter.get('/', requireAuth, requireRole('merchant', 'admin'), controller.listForShop)
