import { Router } from 'express'
import { requireAuth } from '../../common/middlewares/requireAuth'
import { uploadImage } from '../../common/middlewares/upload'
import * as controller from './products.controller'

/** Mounted at the API root: product routes live under both `/shops/:shopId` and `/products`. */
export const productsRouter = Router()
productsRouter.post('/shops/:shopId/products', requireAuth, uploadImage, controller.create)
productsRouter.put('/products/:id', requireAuth, uploadImage, controller.update)
productsRouter.patch('/products/:id/status', requireAuth, controller.setStatus)
