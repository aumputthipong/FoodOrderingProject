import { Router } from 'express'
import { requireAuth } from '../../common/middlewares/requireAuth'
import * as controller from './cart.controller'

export const cartRouter = Router()
cartRouter.use(requireAuth)
cartRouter.get('/', controller.list)
cartRouter.put('/shops/:shopId/items', controller.replaceItems)
cartRouter.patch('/items/:id', controller.updateItem)
cartRouter.delete('/items/:id', controller.removeItem)
